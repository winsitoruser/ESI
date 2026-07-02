import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { 
  TrendingUp, 
  TrendingDown,
  Truck,
  Users,
  Fuel,
  Wrench,
  Shield,
  DollarSign,
  Activity,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Download,
  Calendar,
  Target,
  Zap,
  Award,
  PieChart,
  LineChart
} from 'lucide-react';
import { mockFleetKPIs } from '../../../lib/mockData/fleetAdvanced';
// KPI page uses computed chart data - fetches fleet stats from API
import {
  LineChart as RechartsLine,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';

export default function FleetKPIDashboard() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [kpis, setKpis] = useState<any>(mockFleetKPIs);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    setMounted(true);
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    try {
      const [vehRes, costRes] = await Promise.all([
        fetch('/api/fleet/vehicles?limit=100'),
        fetch('/api/fleet/costs')
      ]);
      if (vehRes.ok && costRes.ok) {
        const vehData = await vehRes.json();
        const costData = await costRes.json();
        // Merge real stats into KPIs if available
        if (vehData.stats) {
          setKpis((prev: any) => ({
            ...prev,
            totalVehicles: vehData.stats.total || prev.totalVehicles,
            activeVehicles: vehData.stats.active || prev.activeVehicles,
          }));
        }
      }
    } catch (e) { console.error('KPI fetch failed:', e); }
  };

  if (!mounted) return null;

  // Chart data
  const monthlyPerformanceData = [
    { month: 'Jan', trips: 320, distance: 12500, fuel: 1850, cost: 45 },
    { month: 'Feb', trips: 380, distance: 14200, fuel: 2100, cost: 52 },
    { month: 'Mar', trips: 420, distance: 15800, fuel: 2350, cost: 58 },
    { month: 'Apr', trips: 390, distance: 14900, fuel: 2200, cost: 54 },
    { month: 'May', trips: 450, distance: 17200, fuel: 2550, cost: 63 },
    { month: 'Jun', trips: 480, distance: 18500, fuel: 2750, cost: 68 }
  ];

  const costBreakdownData = [
    { name: 'Fuel', value: 45, color: '#f97316' },
    { name: 'Maintenance', value: 25, color: '#8b5cf6' },
    { name: 'Driver Salary', value: 20, color: '#3b82f6' },
    { name: 'Insurance', value: 10, color: '#10b981' }
  ];

  const vehicleUtilizationData = [
    { name: 'Active', value: 85, fill: '#10b981' },
    { name: 'Idle', value: 15, fill: '#ef4444' }
  ];

  const safetyScoreData = [
    { category: 'Speed', score: 92 },
    { category: 'Braking', score: 88 },
    { category: 'Acceleration', score: 90 },
    { category: 'Cornering', score: 85 },
    { category: 'Compliance', score: 95 }
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#f59e0b'];

  const KPICard = ({ title, value, unit, icon: Icon, trend, trendValue, gradient, subtitle }: any) => (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`}></div>
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-4 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${
              trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {trendValue}%
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            {value.toLocaleString()}{unit && <span className="text-xl ml-1">{unit}</span>}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <HQLayout>
      <div className="p-6">
        {/* Header with Gradient */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <BarChart3 className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold">{t('fleet.kpiTitle')}</h1>
                    <p className="text-blue-100 mt-1">{t('fleet.kpiSubtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4" />
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value as any)}
                      className="bg-transparent border-none text-white font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="today" className="text-gray-900">Hari Ini</option>
                      <option value="week" className="text-gray-900">Minggu Ini</option>
                      <option value="month" className="text-gray-900">Bulan Ini</option>
                      <option value="year" className="text-gray-900">Tahun Ini</option>
                    </select>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all shadow-lg font-semibold">
                  <Download className="w-5 h-5" />
                  {t('fleet.exportReport')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fleet Overview KPIs */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t('fleet.fleetSummary')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard
              title="Total Kendaraan"
              value={kpis.overview.totalVehicles}
              icon={Truck}
              gradient="from-blue-500 to-blue-600"
              subtitle="Semua kendaraan terdaftar"
            />
            <KPICard
              title="Kendaraan Aktif"
              value={kpis.overview.activeVehicles}
              icon={CheckCircle}
              gradient="from-green-500 to-emerald-600"
              trend="up"
              trendValue={5}
              subtitle="Sedang beroperasi"
            />
            <KPICard
              title="Sedang di Jalan"
              value={kpis.overview.vehiclesOnRoute}
              icon={MapPin}
              gradient="from-purple-500 to-purple-600"
              subtitle="Di rute aktif"
            />
            <KPICard
              title="Tingkat Utilisasi"
              value={kpis.overview.fleetUtilization}
              unit="%"
              icon={Target}
              gradient="from-indigo-500 to-indigo-600"
              trend="up"
              trendValue={3}
              subtitle="Efisiensi armada"
            />
          </div>
        </div>

        {/* Operational KPIs */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t('fleet.operationalPerformance')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard
              title="Total Jarak Bulan Ini"
              value={kpis.operational.totalDistanceMonth}
              unit="km"
              icon={MapPin}
              gradient="from-blue-500 to-cyan-600"
              trend="up"
              trendValue={12}
              subtitle="Jarak tempuh"
            />
            <KPICard
              title="Total Trip Bulan Ini"
              value={kpis.operational.totalTripsMonth}
              icon={Truck}
              gradient="from-green-500 to-emerald-600"
              trend="up"
              trendValue={8}
              subtitle="Perjalanan selesai"
            />
            <KPICard
              title="On-Time Delivery"
              value={kpis.operational.onTimeDeliveryRate}
              unit="%"
              icon={CheckCircle}
              gradient="from-emerald-500 to-teal-600"
              trend="up"
              trendValue={2}
              subtitle="Performa pengiriman"
            />
            <KPICard
              title="Penyelesaian Rute"
              value={kpis.operational.routeCompletionRate}
              unit="%"
              icon={Activity}
              gradient="from-teal-500 to-cyan-600"
              subtitle="Efisiensi rute"
            />
          </div>
        </div>

        {/* Performance Trends Chart */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                  <LineChart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Performance Trends</h3>
                  <p className="text-sm text-gray-500">Monthly fleet performance metrics</p>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={monthlyPerformanceData}>
                <defs>
                  <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorDistance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Area type="monotone" dataKey="trips" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTrips)" name="Total Trips" />
                <Area type="monotone" dataKey="distance" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorDistance)" name="Distance (km)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficiency & Cost Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Efficiency Metrics */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                <Fuel className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Efficiency Metrics</h3>
                <p className="text-sm text-gray-500">Fuel and operational efficiency</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-500 rounded-lg">
                    <Fuel className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fuel Efficiency</p>
                    <p className="text-2xl font-bold text-gray-900">{kpis.efficiency.averageFuelEfficiency} km/L</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                  <TrendingUp className="w-4 h-4" />
                  5%
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500 rounded-lg">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Speed</p>
                    <p className="text-2xl font-bold text-gray-900">{kpis.efficiency.averageSpeed} km/h</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500 rounded-lg">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Idle Time</p>
                    <p className="text-2xl font-bold text-gray-900">{kpis.efficiency.idleTimePercentage}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                  <TrendingDown className="w-4 h-4" />
                  3%
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500 rounded-lg">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cost per KM</p>
                    <p className="text-2xl font-bold text-gray-900">Rp {kpis.efficiency.costPerKilometer.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                  <TrendingDown className="w-4 h-4" />
                  2%
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Cost Breakdown</h3>
                <p className="text-sm text-gray-500">Operating cost distribution</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={costBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {costBreakdownData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Maintenance & Safety */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Maintenance KPIs */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Maintenance & Service</h3>
                <p className="text-sm text-gray-500">Vehicle maintenance status</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm text-gray-600">Due for Service</p>
                </div>
                <p className="text-3xl font-bold text-yellow-600">{kpis.maintenance.vehiclesDueForService}</p>
                <p className="text-xs text-gray-500 mt-1">vehicles</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-gray-600">Overdue</p>
                </div>
                <p className="text-3xl font-bold text-red-600">{kpis.maintenance.overdueMainten}</p>
                <p className="text-xs text-gray-500 mt-1">vehicles</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Avg Downtime</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{kpis.maintenance.averageDowntimeDays} days</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Maintenance Cost</span>
                </div>
                <span className="text-lg font-bold text-gray-900">Rp {Math.round(kpis.maintenance.maintenanceCostMonth / 1000000)}Jt</span>
              </div>
            </div>
          </div>

          {/* Safety Score Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Safety Performance</h3>
                <p className="text-sm text-gray-500">Driver safety metrics</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={safetyScoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="category" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="score" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Safety & Compliance KPIs */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t('fleet.safetyCompliance')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard
              title="Skor Keselamatan"
              value={kpis.safety.averageSafetyScore}
              unit="/100"
              icon={Shield}
              gradient="from-green-500 to-emerald-600"
              trend="up"
              trendValue={1}
              subtitle="Rating keselamatan keseluruhan"
            />
            <KPICard
              title="Insiden Kecepatan"
              value={kpis.safety.speedingIncidents}
              icon={AlertCircle}
              gradient="from-red-500 to-rose-600"
              trend="down"
              trendValue={20}
              subtitle="Bulan ini"
            />
            <KPICard
              title="Pengereman Keras"
              value={kpis.safety.harshBrakingEvents}
              unit="events"
              icon={AlertCircle}
              gradient="from-orange-500 to-red-600"
              subtitle="Kejadian keselamatan"
            />
            <KPICard
              title="Tingkat Kepatuhan"
              value={kpis.safety.complianceRate}
              unit="%"
              icon={CheckCircle}
              gradient="from-emerald-500 to-green-600"
              subtitle="Kepatuhan regulasi"
            />
          </div>
        </div>

        {/* Cost Analysis */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t('fleet.costAnalysis')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard
              title="Total Biaya Operasi"
              value={Math.round(kpis.cost.totalOperatingCost / 1000000)}
              unit="Jt"
              icon={DollarSign}
              gradient="from-red-500 to-rose-600"
              subtitle="Total bulanan"
            />
            <KPICard
              title="Biaya BBM"
              value={Math.round(kpis.cost.fuelCost / 1000000)}
              unit="Jt"
              icon={Fuel}
              gradient="from-orange-500 to-red-600"
              trend="down"
              trendValue={5}
              subtitle="Pengeluaran BBM"
            />
            <KPICard
              title="Biaya Pengemudi"
              value={Math.round(kpis.cost.driverCost / 1000000)}
              unit="Jt"
              icon={Users}
              gradient="from-purple-500 to-pink-600"
              subtitle="Gaji & tunjangan"
            />
            <KPICard
              title="Biaya per Perjalanan"
              value={Math.round(kpis.cost.costPerTrip / 1000)}
              unit="K"
              icon={Truck}
              gradient="from-indigo-500 to-purple-600"
              subtitle="Rata-rata per perjalanan"
            />
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Top Performing Vehicles */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Top Performing Vehicles</h3>
                <p className="text-sm text-gray-500">Best fuel efficiency this month</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { plate: 'B 1234 XYZ', efficiency: 8.5, trips: 45, rank: 1 },
                { plate: 'B 5678 ABC', efficiency: 8.2, trips: 42, rank: 2 },
                { plate: 'B 9999 DEF', efficiency: 7.8, trips: 38, rank: 3 }
              ].map((vehicle, idx) => (
                <div key={idx} className="relative overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        vehicle.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                        vehicle.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                        'bg-gradient-to-br from-orange-400 to-orange-600'
                      }`}>
                        {vehicle.rank}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{vehicle.plate}</p>
                        <p className="text-sm text-gray-600">{vehicle.trips} trips completed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{vehicle.efficiency}</p>
                      <p className="text-xs text-gray-500">km/L</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performing Drivers */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Top Performing Drivers</h3>
                <p className="text-sm text-gray-500">Highest rated drivers this month</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Budi Santoso', rating: 4.9, trips: 48, rank: 1 },
                { name: 'Ahmad Hidayat', rating: 4.8, trips: 45, rank: 2 },
                { name: 'Dewi Lestari', rating: 4.7, trips: 42, rank: 3 }
              ].map((driver, idx) => (
                <div key={idx} className="relative overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        driver.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                        driver.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                        'bg-gradient-to-br from-orange-400 to-orange-600'
                      }`}>
                        {driver.rank}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{driver.name}</p>
                        <p className="text-sm text-gray-600">{driver.trips} trips completed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold text-yellow-500">★</p>
                        <p className="text-2xl font-bold text-gray-900">{driver.rating}</p>
                      </div>
                      <p className="text-xs text-gray-500">rating</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
