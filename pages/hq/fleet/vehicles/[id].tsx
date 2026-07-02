import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { 
  Truck, 
  MapPin, 
  Fuel, 
  Wrench, 
  FileText,
  Calendar,
  DollarSign,
  Activity,
  TrendingUp,
  AlertCircle,
  Edit,
  ArrowLeft,
  Download
} from 'lucide-react';
import { getMockVehicleById } from '../../../../lib/mockData/fleet';
import { 
  getFuelTransactionsByVehicle, 
  getTripsByVehicle,
  getMaintenanceByVehicle,
  calculateVehicleFuelEfficiency
} from '../../../../lib/mockData/fleetAdvanced';

export default function VehicleDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const [mounted, setMounted] = useState(false);
  const [vehicle, setVehicle] = useState<any>(null);
  const [fuelTransactions, setFuelTransactions] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'trips' | 'fuel' | 'maintenance' | 'costs'>('overview');

  useEffect(() => {
    setMounted(true);
    if (id) {
      loadVehicleData(id as string);
    }
  }, [id]);

  const loadVehicleData = (vehicleId: string) => {
    const vehicleData = getMockVehicleById(vehicleId);
    setVehicle(vehicleData);
    setFuelTransactions(getFuelTransactionsByVehicle(vehicleId));
    setTrips(getTripsByVehicle(vehicleId));
    setMaintenance(getMaintenanceByVehicle(vehicleId));
  };

  if (!mounted || !vehicle) return null;

  const fuelEfficiency = calculateVehicleFuelEfficiency(vehicle.id);
  const completedTrips = trips.filter(t => t.status === 'completed');
  const totalDistance = completedTrips.reduce((sum, t) => sum + t.distanceKm, 0);
  const totalFuelCost = fuelTransactions.reduce((sum, t) => sum + t.totalCost, 0);
  const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + m.totalCost, 0);

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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vehicle.licensePlate}</h1>
              <p className="text-gray-600">{vehicle.brand} {vehicle.model} - {vehicle.vehicleNumber}</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export Report
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Distance</p>
                <p className="text-xl font-bold text-gray-900">{totalDistance.toLocaleString()} km</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Fuel className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Fuel Efficiency</p>
                <p className="text-xl font-bold text-gray-900">{fuelEfficiency.toFixed(1)} km/L</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Trips</p>
                <p className="text-xl font-bold text-gray-900">{completedTrips.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Costs</p>
                <p className="text-xl font-bold text-gray-900">
                  Rp {((totalFuelCost + totalMaintenanceCost) / 1000000).toFixed(1)}Jt
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
                { id: 'overview', label: 'Ringkasan', icon: Truck },
                { id: 'trips', label: 'Riwayat Perjalanan', icon: MapPin },
                { id: 'fuel', label: 'Catatan BBM', icon: Fuel },
                { id: 'maintenance', label: 'Pemeliharaan', icon: Wrench },
                { id: 'costs', label: 'Analisis Biaya', icon: DollarSign }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 font-medium flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
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
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">License Plate</p>
                      <p className="font-medium text-gray-900">{vehicle.licensePlate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Vehicle Type</p>
                      <p className="font-medium text-gray-900">{vehicle.vehicleType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Brand & Model</p>
                      <p className="font-medium text-gray-900">{vehicle.brand} {vehicle.model}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Year</p>
                      <p className="font-medium text-gray-900">{vehicle.year}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Color</p>
                      <p className="font-medium text-gray-900">{vehicle.color}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ownership</p>
                      <p className="font-medium text-gray-900">{vehicle.ownershipType}</p>
                    </div>
                  </div>
                </div>

                {/* Capacity */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Capacity</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Max Weight</p>
                      <p className="font-medium text-gray-900">{vehicle.maxWeightKg} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Max Volume</p>
                      <p className="font-medium text-gray-900">{vehicle.maxVolumeM3} m³</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fuel Tank</p>
                      <p className="font-medium text-gray-900">{vehicle.fuelTankCapacity} L</p>
                    </div>
                  </div>
                </div>

                {/* Documentation */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentation</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Registration (STNK)</p>
                      <p className="font-medium text-gray-900">{vehicle.registrationNumber}</p>
                      <p className="text-xs text-gray-500">Expires: {vehicle.registrationExpiry}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Insurance</p>
                      <p className="font-medium text-gray-900">{vehicle.insurancePolicyNumber}</p>
                      <p className="text-xs text-gray-500">{vehicle.insuranceProvider}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Insurance Expiry</p>
                      <p className="font-medium text-gray-900">{vehicle.insuranceExpiry}</p>
                    </div>
                  </div>
                </div>

                {/* Current Status */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-medium text-gray-900">{vehicle.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Current Location</p>
                      <p className="font-medium text-gray-900">{vehicle.currentLocation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Odometer</p>
                      <p className="font-medium text-gray-900">{vehicle.currentOdometerKm.toLocaleString()} km</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last Service</p>
                      <p className="font-medium text-gray-900">{vehicle.lastServiceDate || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Next Service Due</p>
                      <p className="font-medium text-gray-900">{vehicle.nextServiceDueKm.toLocaleString()} km</p>
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fuel</th>
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
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {trip.fuelConsumedLiters ? `${trip.fuelConsumedLiters} L` : '-'}
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

            {/* Fuel Tab */}
            {activeTab === 'fuel' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Transactions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Station</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Price/L</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Total Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Odometer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {fuelTransactions.map(transaction => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(transaction.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{transaction.fuelStation}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{transaction.quantityLiters} L</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            Rp {transaction.pricePerLiter.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            Rp {transaction.totalCost.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {transaction.odometerReading.toLocaleString()} km
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Records</h3>
                <div className="space-y-4">
                  {maintenance.map(record => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{record.maintenanceType}</h4>
                          <p className="text-sm text-gray-600">{record.serviceProvider}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            Rp {record.totalCost.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">{record.serviceDate}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{record.description}</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Odometer</p>
                          <p className="font-medium">{record.odometerReading.toLocaleString()} km</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Labor Cost</p>
                          <p className="font-medium">Rp {record.laborCost.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Parts Cost</p>
                          <p className="font-medium">Rp {record.partsCost.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Costs Tab */}
            {activeTab === 'costs' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-700 mb-1">Total Fuel Cost</p>
                    <p className="text-2xl font-bold text-orange-900">
                      Rp {(totalFuelCost / 1000000).toFixed(1)}Jt
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-700 mb-1">Total Maintenance Cost</p>
                    <p className="text-2xl font-bold text-purple-900">
                      Rp {(totalMaintenanceCost / 1000000).toFixed(1)}Jt
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700 mb-1">Total Operating Cost</p>
                    <p className="text-2xl font-bold text-blue-900">
                      Rp {((totalFuelCost + totalMaintenanceCost) / 1000000).toFixed(1)}Jt
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Cost per Kilometer</p>
                  <p className="text-3xl font-bold text-gray-900">
                    Rp {totalDistance > 0 ? ((totalFuelCost + totalMaintenanceCost) / totalDistance).toFixed(0) : 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
