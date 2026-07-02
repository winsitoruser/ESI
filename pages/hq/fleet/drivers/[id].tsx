import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { 
  User, 
  Phone, 
  Mail,
  MapPin, 
  Award,
  TrendingUp,
  Calendar,
  DollarSign,
  Activity,
  Shield,
  FileText,
  Edit,
  ArrowLeft,
  Download,
  Clock,
  Truck
} from 'lucide-react';
import { getMockDriverById } from '../../../../lib/mockData/fleet';
import { getTripsByDriver, calculateDriverPerformance } from '../../../../lib/mockData/fleetAdvanced';

export default function DriverDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const [mounted, setMounted] = useState(false);
  const [driver, setDriver] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'trips' | 'safety' | 'earnings'>('overview');

  useEffect(() => {
    setMounted(true);
    if (id) {
      loadDriverData(id as string);
    }
  }, [id]);

  const loadDriverData = (driverId: string) => {
    const driverData = getMockDriverById(driverId);
    setDriver(driverData);
    const driverTrips = getTripsByDriver(driverId);
    setTrips(driverTrips);
    setPerformance(calculateDriverPerformance(driverId));
  };

  if (!mounted || !driver) return null;

  const onTimeRate = driver.totalDeliveries > 0 
    ? Math.round((driver.onTimeDeliveries / driver.totalDeliveries) * 100) 
    : 0;

  return (
    <HQLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/hq/fleet')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Fleet
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {driver.fullName.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{driver.fullName}</h1>
                <p className="text-gray-600">{driver.driverNumber} • {driver.licenseType}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export Report
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Trips</p>
                <p className="text-xl font-bold text-gray-900">{driver.totalDeliveries}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">On-Time Rate</p>
                <p className="text-xl font-bold text-gray-900">{onTimeRate}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Safety Score</p>
                <p className="text-xl font-bold text-gray-900">{driver.safetyScore}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rating</p>
                <p className="text-xl font-bold text-gray-900">★ {driver.customerRating}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Distance</p>
                <p className="text-xl font-bold text-gray-900">
                  {performance ? performance.totalDistance.toLocaleString() : 0} km
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <div className="flex">
              {[
                { id: 'overview', label: 'Ringkasan', icon: User },
                { id: 'performance', label: 'Kinerja', icon: TrendingUp },
                { id: 'trips', label: 'Riwayat Perjalanan', icon: MapPin },
                { id: 'safety', label: 'Catatan Keselamatan', icon: Shield },
                { id: 'earnings', label: 'Pendapatan', icon: DollarSign }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 font-medium flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Personal Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-medium text-gray-900">{driver.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Driver Number</p>
                      <p className="font-medium text-gray-900">{driver.driverNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{driver.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{driver.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date of Birth</p>
                      <p className="font-medium text-gray-900">{driver.dateOfBirth || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium text-gray-900">{driver.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* License Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">License & Certification</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">License Number</p>
                      <p className="font-medium text-gray-900">{driver.licenseNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">License Type</p>
                      <p className="font-medium text-gray-900">{driver.licenseType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Issue Date</p>
                      <p className="font-medium text-gray-900">{driver.licenseIssueDate || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Expiry Date</p>
                      <p className="font-medium text-gray-900">{driver.licenseExpiryDate || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Employment */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Employment Type</p>
                      <p className="font-medium text-gray-900">{driver.employmentType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Hire Date</p>
                      <p className="font-medium text-gray-900">{driver.hireDate || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-medium text-gray-900">{driver.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Availability</p>
                      <p className="font-medium text-gray-900">{driver.availabilityStatus}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && performance && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700 mb-1">Total Trips</p>
                    <p className="text-3xl font-bold text-blue-900">{performance.totalTrips}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700 mb-1">Total Distance</p>
                    <p className="text-3xl font-bold text-green-900">{performance.totalDistance.toLocaleString()} km</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-700 mb-1">Average Speed</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {performance.averageSpeed ? performance.averageSpeed.toFixed(1) : 0} km/h
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Delivery Performance</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Total Deliveries</span>
                        <span className="font-semibold">{driver.totalDeliveries}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">On-Time Deliveries</span>
                        <span className="font-semibold text-green-600">{driver.onTimeDeliveries}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">On-Time Rate</span>
                        <span className="font-semibold text-green-600">{onTimeRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                        <div 
                          className="bg-green-600 h-3 rounded-full" 
                          style={{ width: `${onTimeRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Efficiency Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Safety Score</span>
                        <span className="font-semibold text-purple-600">{driver.safetyScore}/100</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Customer Rating</span>
                        <span className="font-semibold text-yellow-600">★ {driver.customerRating}/5.0</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Total Idle Time</span>
                        <span className="font-semibold">{performance.totalIdleTime} min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trips Tab */}
            {activeTab === 'trips' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Trip Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Route</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Distance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {trips.map(trip => (
                        <tr key={trip.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{trip.tripNumber}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {trip.startLocation} → {trip.endLocation}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(trip.startTime).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{trip.distanceKm} km</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {trip.durationMinutes ? `${trip.durationMinutes} min` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {trip.revenue ? `Rp ${trip.revenue.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                              trip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {trip.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Safety Tab */}
            {activeTab === 'safety' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <Shield className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-green-700 mb-1">Safety Score</p>
                    <p className="text-4xl font-bold text-green-900">{driver.safetyScore}</p>
                    <p className="text-xs text-green-600 mt-1">out of 100</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <Activity className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-blue-700 mb-1">Incidents</p>
                    <p className="text-4xl font-bold text-blue-900">0</p>
                    <p className="text-xs text-blue-600 mt-1">this month</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                    <Award className="w-12 h-12 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm text-purple-700 mb-1">Safe Days</p>
                    <p className="text-4xl font-bold text-purple-900">365</p>
                    <p className="text-xs text-purple-600 mt-1">consecutive</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Safety Record</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">No accidents recorded</span>
                      <span className="text-green-600 font-semibold">✓ Clean Record</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">No violations</span>
                      <span className="text-green-600 font-semibold">✓ Compliant</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">Safety training completed</span>
                      <span className="text-green-600 font-semibold">✓ Up to date</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Earnings Tab */}
            {activeTab === 'earnings' && performance && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700 mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-900">
                      Rp {(performance.totalRevenue / 1000000).toFixed(1)}Jt
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700 mb-1">Total Profit</p>
                    <p className="text-3xl font-bold text-blue-900">
                      Rp {(performance.totalProfit / 1000000).toFixed(1)}Jt
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-700 mb-1">Avg per Trip</p>
                    <p className="text-3xl font-bold text-purple-900">
                      Rp {performance.totalTrips > 0 ? (performance.totalRevenue / performance.totalTrips / 1000).toFixed(0) : 0}K
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Earnings Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Base Salary</span>
                      <span className="font-semibold">Rp 5,000,000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Trip Incentives</span>
                      <span className="font-semibold text-green-600">Rp 2,500,000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Performance Bonus</span>
                      <span className="font-semibold text-green-600">Rp 1,000,000</span>
                    </div>
                    <div className="border-t border-gray-300 pt-3 flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Total Earnings</span>
                      <span className="font-bold text-xl text-gray-900">Rp 8,500,000</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
