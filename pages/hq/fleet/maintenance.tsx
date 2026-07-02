import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { 
  Wrench, 
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Download,
  Filter
} from 'lucide-react';
import { mockMaintenanceRecords } from '../../../lib/mockData/fleetAdvanced';

export default function MaintenanceManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>(mockMaintenanceRecords);
  const [activeTab, setActiveTab] = useState<'schedules' | 'history'>('schedules');
  const [vehicleMap, setVehicleMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedRes, vehRes, maintRes] = await Promise.all([
        fetch('/api/fleet/maintenance/schedules'),
        fetch('/api/fleet/vehicles?limit=100'),
        fetch('/api/hq/fleet/maintenance')
      ]);
      if (schedRes.ok) { const d = await schedRes.json(); setSchedules(d.data || []); }
      if (vehRes.ok) {
        const d = await vehRes.json();
        const map: Record<string, string> = {};
        (d.data || []).forEach((v: any) => { map[v.id] = v.licensePlate || v.vehicleNumber; });
        setVehicleMap(map);
      }
      if (maintRes.ok) {
        const d = await maintRes.json();
        const payload = d.data || d;
        if (Array.isArray(payload)) setRecords(payload);
        else if (payload.records) setRecords(payload.records);
      }
    } catch (e) { console.error('Maintenance fetch failed:', e); }
  };

  if (!mounted) return null;

  const activeSchedules = schedules.filter(s => s.status === 'active').length;
  const overdueSchedules = schedules.filter(s => s.status === 'overdue').length;
  const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);
  const avgCost = records.length > 0 ? totalCost / records.length : 0;

  const getVehicleInfo = (vehicleId: string) => {
    return vehicleMap[vehicleId] || vehicleId;
  };

  return (
    <HQLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('fleet.maintenanceTitle')}</h1>
          <p className="text-gray-600">{t('fleet.maintenanceSubtitle')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.activeSchedules')}</p>
            <p className="text-2xl font-bold text-gray-900">{activeSchedules}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.overdueLabel')}</p>
            <p className="text-2xl font-bold text-gray-900">{overdueSchedules}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Cost (Month)</p>
            <p className="text-2xl font-bold text-gray-900">
              Rp {(totalCost / 1000000).toFixed(1)}Jt
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Avg Cost per Service</p>
            <p className="text-2xl font-bold text-gray-900">
              Rp {(avgCost / 1000000).toFixed(1)}Jt
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('schedules')}
                className={`px-6 py-3 font-medium flex items-center gap-2 ${
                  activeTab === 'schedules'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                {t('fleet.schedules')} ({schedules.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 font-medium flex items-center gap-2 ${
                  activeTab === 'history'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Wrench className="w-4 h-4" />
                Service History ({records.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Schedules Tab */}
            {activeTab === 'schedules' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="overdue">Overdue</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Plus className="w-4 h-4" />
                      Add Schedule
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {schedules.map(schedule => (
                    <div key={schedule.id} className={`border rounded-lg p-4 ${
                      schedule.status === 'overdue' ? 'border-red-300 bg-red-50' :
                      schedule.status === 'active' ? 'border-blue-300 bg-blue-50' :
                      'border-gray-300 bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{schedule.maintenanceType}</h3>
                          <p className="text-sm text-gray-600">{getVehicleInfo(schedule.vehicleId)}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full ${
                          schedule.status === 'overdue' ? 'bg-red-200 text-red-800' :
                          schedule.status === 'active' ? 'bg-blue-200 text-blue-800' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {schedule.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Interval Type</p>
                          <p className="font-medium">{schedule.intervalType}</p>
                        </div>
                        {schedule.intervalKilometers && (
                          <div>
                            <p className="text-gray-600">Interval (km)</p>
                            <p className="font-medium">{schedule.intervalKilometers.toLocaleString()} km</p>
                          </div>
                        )}
                        {schedule.lastServiceDate && (
                          <div>
                            <p className="text-gray-600">Last Service</p>
                            <p className="font-medium">{new Date(schedule.lastServiceDate).toLocaleDateString('id-ID')}</p>
                          </div>
                        )}
                        {schedule.nextServiceOdometer && (
                          <div>
                            <p className="text-gray-600">Next Service Due</p>
                            <p className="font-medium">{schedule.nextServiceOdometer.toLocaleString()} km</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service History Tab */}
            {activeTab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="month"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      defaultValue={new Date().toISOString().slice(0, 7)}
                    />
                    <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="all">All Vehicles</option>
                      <option value="veh-001">B 1234 XYZ</option>
                      <option value="veh-002">B 5678 ABC</option>
                    </select>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    Add Service Record
                  </button>
                </div>

                <div className="space-y-4">
                  {records.map(record => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{record.maintenanceType}</h3>
                          <p className="text-sm text-gray-600">{getVehicleInfo(record.vehicleId)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            Rp {record.totalCost.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">{record.serviceDate}</p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{record.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Service Provider</p>
                          <p className="font-medium">{record.serviceProvider}</p>
                        </div>
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

                      {record.nextServiceDue && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            Next service due at: <span className="font-medium text-gray-900">{record.nextServiceDue.toLocaleString()} km</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
