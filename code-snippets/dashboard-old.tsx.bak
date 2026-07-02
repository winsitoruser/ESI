import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { 
  FaChartLine, FaBoxOpen, FaShoppingCart, FaUsers, FaMoneyBillWave, 
  FaCalendarAlt, FaLock, FaSpinner, FaFileInvoiceDollar, FaHandHoldingUsd,
  FaArrowUp, FaArrowDown, FaSyncAlt, FaEllipsisH, FaBell, FaSearch,
  FaFilter, FaCog, FaClock, FaBoxes
} from "react-icons/fa";
// import { 
//   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
//   PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line
// } from 'recharts';

// Import layout and dashboard components
import DashboardLayout from "@/components/layouts/DashboardLayout";

// Import insight cards - commented out temporarily
// import FinanceInsightCard from "@/components/dashboard/FinanceInsightCard";
// import InventoryInsightCard from "@/components/dashboard/InventoryInsightCard";
// import PurchasingSalesInsightCard from "@/components/dashboard/PurchasingSalesInsightCard";
// import EmployeesScheduleInsightCard from "@/components/dashboard/EmployeesScheduleInsightCard";
// import { useIntegratedDashboardData } from "@/components/dashboard/IntegratedDataService";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Badge } from "@/components/ui/badge";
// import { useRolePermissions } from "@/hooks/useRolePermissions";
// import { RolePermissionGate } from "@/components/auth/PermissionGate";

const Dashboard: NextPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { hasPermission, userRole } = useRolePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Notifications state
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'warning',
      title: 'Stok Menipis',
      message: '5 produk memiliki stok di bawah minimum',
      time: '5 menit yang lalu',
      unread: true
    },
    {
      id: 2,
      type: 'info',
      title: 'Laporan Keuangan',
      message: 'Laporan keuangan bulan ini sudah tersedia',
      time: '1 jam yang lalu',
      unread: true
    },
    {
      id: 3,
      type: 'success',
      title: 'Pembayaran Diterima',
      message: 'Pembayaran dari PT. ABC sebesar Rp 5.000.000 telah diterima',
      time: '2 jam yang lalu',
      unread: false
    },
    {
      id: 4,
      type: 'warning',
      title: 'Produk Kadaluarsa',
      message: '3 produk akan kadaluarsa dalam 7 hari',
      time: '3 jam yang lalu',
      unread: false
    },
    {
      id: 5,
      type: 'info',
      title: 'Jadwal Shift',
      message: 'Jadwal shift minggu depan telah dipublikasikan',
      time: '5 jam yang lalu',
      unread: false
    }
  ]);
  
  const unreadCount = notifications.filter(n => n.unread).length;
  
  // Function to mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({
        ...notification,
        unread: false
      }))
    );
  };
  
  // Use integrated dashboard data
  const { data, isLoading, error: dataError } = useIntegratedDashboardData();
  
  // Get current date and time for display
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  const dateOptions: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  };

  // Check authentication and role-based access
  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    // Check if user has permission to access business intelligence dashboard
    // Allow ADMIN, OWNER, MANAGER, and PARTNER roles to access this dashboard
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'OWNER', 'PARTNER', 'MANAGER'];
    
    if (session?.user?.role && allowedRoles.includes(session.user.role)) {
      setLoading(false);
    } else {
      // Redirect other roles to their appropriate dashboards
      switch (session?.user?.role) {
        case 'PHARMACIST':
          router.push('/inventory');
          break;
        case 'CASHIER':
          router.push('/pos/kasir');
          break;
        case 'DOCTOR':
        case 'NURSE':
        case 'CLINICIAN':
          router.push('/clinic');
          break;
        case 'FINANCE_STAFF':
          router.push('/finance');
          break;
        default:
          router.push('/auth/login');
          break;
      }
    }
  }, [session, status, router]);

  // Handle manual data refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Display loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <FaSpinner className="animate-spin h-12 w-12 mx-auto text-red-600" />
            <p className="mt-4 text-gray-700">Memuat dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Dashboard | BEDAGANG Cloud POS</title>
      </Head>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #fee2e2;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #ef4444, #f97316);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #dc2626, #ea580c);
        }
      `}</style>
      
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-gradient-to-br from-red-500/10 to-orange-400/5 blur-xl"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 rounded-full bg-gradient-to-tr from-orange-400/10 to-red-500/5 blur-xl"></div>
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full bg-gradient-to-tl from-orange-400/5 to-red-500/10 blur-xl"></div>
      </div>
      
      <div className="container mx-auto px-4 py-6 space-y-6 mb-24">
        {/* Header Section */}
        <Card className="border-red-100 bg-white shadow-sm overflow-hidden relative">
          {/* Ornamen Farmanesia */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-600/10 to-orange-500/10 rounded-bl-full z-0 animate-ping opacity-75"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-500/10 to-red-600/10 rounded-tr-full z-0 hover:animate-spin transition-all duration-1000"></div>
          <div className="absolute top-3 right-3">
            <div className="text-xs font-bold bg-gradient-to-r from-red-600 to-orange-500 text-transparent bg-clip-text animate-bounce">FARMANESIA</div>
          </div>
          
          <div className="absolute top-0 left-6 h-1 w-16 bg-gradient-to-r from-red-600 to-orange-500 motion-safe:animate-[shimmer_2s_ease-in-out_infinite]"></div>
          <div className="absolute bottom-0 right-6 h-1 w-16 bg-gradient-to-r from-orange-500 to-red-600 motion-safe:animate-[shimmer_2s_ease-in-out_infinite_alternate]"></div>
          
          <CardContent className="py-6 relative z-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
              <div>
                <div className="flex items-center">
                  <div className="mr-3 h-8 w-8 rounded-full bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center hover:scale-110 transition-transform duration-300">
                    <FaChartLine className="text-white text-sm animate-bounce" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-500 text-transparent bg-clip-text hover:scale-105 transition-transform duration-500">
                      Business Intelligence Dashboard
                    </h1>
                    <div className="flex items-center mt-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-100 to-orange-100 text-red-800 border border-red-200">
                        <FaLock className="mr-1 h-3 w-3" />
                        {userRole} Access
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 mt-1 ml-11">
                  Analisis komprehensif terintegrasi dari seluruh modul - Akses khusus untuk Admin/Owner
                </p>
              </div>
              
              <div className="flex flex-col md:items-end space-y-1">
                <div className="flex items-center text-gray-600">
                  <FaCalendarAlt className="mr-2 text-red-500" />
                  {currentDateTime.toLocaleDateString('id-ID', dateOptions)}
                </div>
                <div className="flex items-center text-gray-600">
                  <FaClock className="mr-2 text-red-500 motion-safe:animate-[spin_10s_linear_infinite]" />
                  {currentDateTime.toLocaleTimeString('id-ID', timeOptions)}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-4">
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-red-100 hover:bg-red-50 hover:text-red-600 transition-all duration-300 transform hover:scale-105"
                  onClick={handleRefresh}
                >
                  <FaSyncAlt className="mr-2 h-3 w-3 hover:animate-spin" />
                  Refresh Data
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-red-100 hover:bg-red-50 hover:text-red-600 transition-all duration-300 transform hover:scale-105"
                >
                  <FaFilter className="mr-2 h-3 w-3" />
                  Filter
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-red-50 hover:text-red-600 hover:rotate-12 transition-all duration-300"
                >
                  <FaCog className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-red-50 hover:text-red-600 relative transition-all duration-300"
                  onClick={() => setShowNotifications(true)}
                >
                  <FaBell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full animate-ping"></span>
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        {unreadCount}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Status Info */}
        {(error || dataError) && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-3 text-amber-800 text-sm flex items-center">
              <FaBell className="mr-2" />
              {error || dataError} Data terakhir diperbarui pada {new Date().toLocaleTimeString('id-ID')}
            </CardContent>
          </Card>
        )}
        
        {/* Main Dashboard Content */}
        <div className="min-h-[500px]">
          {isLoading && !data ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-100 rounded"></div>
              <div className="h-96 bg-gray-100 rounded"></div>
            </div>
          ) : data && Object.values(data).some(val => val !== null) ? (
            <div className="space-y-6">
              <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 mb-6">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-orange-500 data-[state=active]:text-white">
                    Ringkasan
                  </TabsTrigger>
                  <TabsTrigger value="finance-inventory" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-orange-500 data-[state=active]:text-white">
                    Keuangan & Inventori
                  </TabsTrigger>
                  <TabsTrigger value="sales-purchasing" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-orange-500 data-[state=active]:text-white">
                    Penjualan & Pembelian
                  </TabsTrigger>
                  <TabsTrigger value="employees-schedule" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-orange-500 data-[state=active]:text-white">
                    Karyawan & Jadwal
                  </TabsTrigger>
                </TabsList>
                
                {/* Overview Tab - Shows summary cards for all areas */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Metric Summary - 4 key metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-red-100 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Total Penjualan</div>
                            <div className="text-xl font-bold text-red-700">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(data.sales.totalSales)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{data.sales.salesCount.toLocaleString()} transaksi</div>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                            <FaShoppingCart className="text-red-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-red-100 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Nilai Inventori</div>
                            <div className="text-xl font-bold text-red-700">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(data.inventory.totalValue)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{data.inventory.totalItems.toLocaleString()} item</div>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                            <FaBoxes className="text-red-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-red-100 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Profit</div>
                            <div className="text-xl font-bold text-red-700">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(data.finance.profit)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Margin: {((data.finance.profit / data.finance.totalRevenue) * 100).toFixed(1)}%</div>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                            <FaMoneyBillWave className="text-red-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-red-100 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Karyawan & Jadwal</div>
                            <div className="text-xl font-bold text-red-700">
                              {data.employees.totalEmployees}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{data.schedule.todayAppointments} jadwal hari ini</div>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                            <FaUsers className="text-red-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Snapshot of All Modules */}
                  <FinanceInsightCard financeData={data.finance} isLoading={false} />
                  <InventoryInsightCard inventoryData={data.inventory} isLoading={false} />
                  <PurchasingSalesInsightCard 
                    purchasingData={data.purchasing}
                    salesData={data.sales}
                    isLoading={false}
                  />
                  <EmployeesScheduleInsightCard
                    employeesData={data.employees}
                    scheduleData={data.schedule}
                    isLoading={false}
                  />
                </TabsContent>
                
                {/* Finance & Inventory Tab */}
                <TabsContent value="finance-inventory" className="space-y-6">
                  <FinanceInsightCard financeData={data.finance} isLoading={false} />
                  <InventoryInsightCard inventoryData={data.inventory} isLoading={false} />
                </TabsContent>
                
                {/* Sales & Purchasing Tab */}
                <TabsContent value="sales-purchasing" className="space-y-6">
                  <PurchasingSalesInsightCard 
                    purchasingData={data.purchasing}
                    salesData={data.sales}
                    isLoading={false}
                  />
                </TabsContent>
                
                {/* Employees & Schedule Tab */}
                <TabsContent value="employees-schedule" className="space-y-6">
                  <EmployeesScheduleInsightCard
                    employeesData={data.employees}
                    scheduleData={data.schedule}
                    isLoading={false}
                  />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card className="border-red-100 shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="text-xl font-medium text-gray-700 mb-2">
                  {dataError ? "Tidak dapat memuat data dashboard" : "Data masih belum ada"}
                </div>
                <p className="text-gray-600 mb-4">
                  {dataError 
                    ? "Terjadi kesalahan saat mengambil data. Silakan coba lagi nanti." 
                    : "Belum ada data yang tersedia untuk ditampilkan pada dashboard. Silakan tambahkan data terlebih dahulu."}
                </p>
                <Button
                  onClick={handleRefresh}
                  className="bg-gradient-to-r from-red-600 to-orange-500 text-white"
                >
                  <FaSyncAlt className="mr-2" /> {dataError ? "Coba Lagi" : "Refresh"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Notification Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FaBell className="text-red-500" />
              Notifikasi
            </DialogTitle>
            <DialogDescription>
              {unreadCount > 0 ? `Anda memiliki ${unreadCount} notifikasi yang belum dibaca` : 'Semua notifikasi sudah dibaca'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`border transition-all hover:shadow-md cursor-pointer ${
                  notification.unread 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="outline"
                          className={`${
                            notification.type === 'warning' 
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : notification.type === 'success'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                          }`}
                        >
                          {notification.type === 'warning' ? '⚠️' : notification.type === 'success' ? '✅' : 'ℹ️'}
                        </Badge>
                        <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                        {notification.unread && (
                          <span className="h-2 w-2 bg-red-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <FaClock className="mr-1" />
                        {notification.time}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {notifications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FaBell className="mx-auto h-12 w-12 mb-3 text-gray-300" />
                <p>Tidak ada notifikasi</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setShowNotifications(false)}
            >
              Tutup
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Tandai Semua Sudah Dibaca
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Dashboard;
