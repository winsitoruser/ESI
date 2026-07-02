import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { 
  MapPin, 
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Truck,
  User,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const MOCK_ROUTES = [
  { id: 'rt1', name: 'Jakarta - Bandung', origin: 'Jakarta', destination: 'Bandung', distance: 150, estimatedDuration: 180, status: 'active', vehicleCount: 3 },
  { id: 'rt2', name: 'Jakarta - Surabaya', origin: 'Jakarta', destination: 'Surabaya', distance: 780, estimatedDuration: 720, status: 'active', vehicleCount: 2 },
  { id: 'rt3', name: 'Jakarta - Semarang', origin: 'Jakarta', destination: 'Semarang', distance: 450, estimatedDuration: 420, status: 'active', vehicleCount: 2 },
];
const MOCK_ASSIGNMENTS = [
  { id: 'ra1', routeId: 'rt1', vehicleId: 'v1', driverId: 'd1', scheduledDate: new Date().toISOString().split('T')[0], status: 'in_progress', departureTime: '06:00', estimatedArrival: '09:00' },
  { id: 'ra2', routeId: 'rt2', vehicleId: 'v2', driverId: 'd2', scheduledDate: new Date().toISOString().split('T')[0], status: 'completed', departureTime: '05:00', estimatedArrival: '17:00' },
];

export default function RouteManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [routes, setRoutes] = useState<any[]>(MOCK_ROUTES);
  const [assignments, setAssignments] = useState<any[]>(MOCK_ASSIGNMENTS);
  const [activeTab, setActiveTab] = useState<'routes' | 'assignments'>('routes');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [routesRes, assignRes] = await Promise.all([
        fetch('/api/fleet/routes'),
        fetch('/api/fleet/routes/assignments')
      ]);
      if (routesRes.ok) { const d = await routesRes.json(); setRoutes(d.data || []); }
      if (assignRes.ok) { const d = await assignRes.json(); setAssignments(d.data || []); }
    } catch (e) { console.error('Failed to fetch fleet routes:', e); setRoutes(MOCK_ROUTES); setAssignments(MOCK_ASSIGNMENTS); }
    setLoading(false);
  };

  if (!mounted) return null;

  const activeRoutes = routes.filter(r => r.status === 'active').length;
  const todayAssignments = assignments.filter(a => a.scheduledDate === new Date().toISOString().split('T')[0]);
  const completedToday = todayAssignments.filter(a => a.status === 'completed').length;
  const inProgress = assignments.filter(a => a.status === 'in_progress').length;

  return (
    <HQLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('fleet.routesTitle')}</h1>
          <p className="text-gray-600">{t('fleet.routesSubtitle')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.activeRoutes')}</p>
            <p className="text-2xl font-bold text-gray-900">{activeRoutes}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.assignmentsToday')}</p>
            <p className="text-2xl font-bold text-gray-900">{todayAssignments.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.inProgress')}</p>
            <p className="text-2xl font-bold text-gray-900">{inProgress}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-orange-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fleet.completedToday')}</p>
            <p className="text-2xl font-bold text-gray-900">{completedToday}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('routes')}
                className={`px-6 py-3 font-medium flex items-center gap-2 ${
                  activeTab === 'routes'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Routes ({routes.length})
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`px-6 py-3 font-medium flex items-center gap-2 ${
                  activeTab === 'assignments'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Assignments ({assignments.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Routes Tab */}
            {activeTab === 'routes' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search routes..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Plus className="w-4 h-4" />
                      Add Route
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {routes.map(route => (
                    <div key={route.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{route.routeName}</h3>
                          <p className="text-sm text-gray-600">{route.routeNumber}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full ${
                          route.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {route.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Type</p>
                          <p className="text-sm font-medium text-gray-900">{route.routeType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Distance</p>
                          <p className="text-sm font-medium text-gray-900">{route.totalDistanceKm} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Duration</p>
                          <p className="text-sm font-medium text-gray-900">{route.estimatedDurationMinutes} min</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Stops</p>
                          <p className="text-sm font-medium text-gray-900">{route.stops.length}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{route.startLocation} → {route.endLocation}</span>
                      </div>

                      {route.stops.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">Stops:</p>
                          <div className="flex flex-wrap gap-2">
                            {route.stops.map((stop: any, idx: number) => (
                              <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {stop.sequence}. {stop.locationName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                    <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="all">All Status</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    Assign Route
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Route</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vehicle</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Driver</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Scheduled</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actual</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Distance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {assignments.map(assignment => {
                        const route = routes.find(r => r.id === assignment.routeId);
                        return (
                          <tr key={assignment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(assignment.scheduledDate).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {route?.routeName || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {assignment.vehicleId === 'veh-001' ? 'B 1234 XYZ' : 'B 5678 ABC'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {assignment.driverId === 'drv-001' ? 'Budi Santoso' : 'Ahmad Hidayat'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {assignment.scheduledStartTime}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {assignment.actualStartTime 
                                ? new Date(assignment.actualStartTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                : '-'
                              }
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                assignment.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {assignment.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {assignment.totalDistanceKm ? `${assignment.totalDistanceKm} km` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
