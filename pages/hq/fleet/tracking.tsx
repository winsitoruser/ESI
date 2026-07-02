import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import FleetMap from '../../../components/hq/fleet/FleetMap';
import { 
  MapPin, 
  Navigation,
  Activity,
  AlertCircle,
  Clock,
  Zap,
  RefreshCw,
  Filter,
  CheckCircle,
  XCircle,
  Map,
  List,
  Eye,
  EyeOff
} from 'lucide-react';
import { mockGPSLocations, mockLocationAlerts, mockGeofences } from '../../../lib/mockData/fleetPhase2';

export default function GPSTracking() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [locations, setLocations] = useState<any[]>(mockGPSLocations);
  const [alerts, setAlerts] = useState<any[]>(mockLocationAlerts);
  const [geofences, setGeofences] = useState<any[]>(mockGeofences);
  const [activeTab, setActiveTab] = useState<'map' | 'alerts' | 'geofences'>('map');
  const [showGeofences, setShowGeofences] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [vehicleMap, setVehicleMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    fetchTracking();
  }, []);

  const fetchTracking = async () => {
    try {
      const [trackRes, alertRes] = await Promise.allSettled([
        fetch('/api/hq/fleet/tracking'),
        fetch('/api/fleet/tracking/live')
      ]);
      if (trackRes.status === 'fulfilled' && trackRes.value.ok) {
        const json = await trackRes.value.json();
        const payload = json.data || json;
        const trackingData = Array.isArray(payload) ? payload : payload.tracking || [];
        if (trackingData.length > 0) {
          const locs = trackingData.map((v: any) => ({
            lat: v.latitude, lng: v.longitude, speed: v.speed, heading: v.heading,
            isMoving: v.status === 'moving', isIdle: v.status === 'stopped' || v.status === 'idle',
            vehicleId: v.vehicleId
          }));
          setLocations(locs);
          const map: Record<string, string> = {};
          trackingData.forEach((v: any) => { map[v.vehicleId] = v.vehicleLicensePlate || v.vehicleId; });
          setVehicleMap(map);
        }
      } else if (alertRes.status === 'fulfilled' && alertRes.value.ok) {
        const data = await alertRes.value.json();
        if (data.data && data.data.length > 0) {
          const locs = data.data.map((v: any) => ({ ...v.location, vehicleId: v.vehicleId }));
          setLocations(locs);
          const map: Record<string, string> = {};
          data.data.forEach((v: any) => { map[v.vehicleId] = v.licensePlate || v.vehicleNumber; });
          setVehicleMap(map);
        }
      }
    } catch (e) { console.error('Tracking fetch failed:', e); }
  };

  if (!mounted) return null;

  const movingVehicles = locations.filter(l => l.isMoving).length;
  const idleVehicles = locations.filter(l => l.isIdle).length;
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;
  const activeGeofences = geofences.filter(g => g.status === 'active').length;

  const getVehicleInfo = (vehicleId: string) => {
    return vehicleMap[vehicleId] || vehicleId;
  };

  return (
    <HQLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Map className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{t('fleet.trackingTitle')}</h1>
          <p className="text-blue-100 mt-1">{t('fleet.trackingSubtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => fetchTracking()}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                  <Activity className="w-7 h-7 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-2">Vehicles Moving</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {movingVehicles}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-600 opacity-5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg">
                  <Clock className="w-7 h-7 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-2">Vehicles Idle</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {idleVehicles}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-600 opacity-5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-2">Active Alerts</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {unacknowledgedAlerts}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-5"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-2">Geofences</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {activeGeofences}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg">
          <div className="border-b border-gray-200">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-6 py-3 font-semibold flex items-center gap-2 rounded-t-lg transition-all ${
                    activeTab === 'map'
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  Live Tracking
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`px-6 py-3 font-semibold flex items-center gap-2 rounded-t-lg transition-all ${
                    activeTab === 'alerts'
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                  Alerts
                  {unacknowledgedAlerts > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      {unacknowledgedAlerts}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('geofences')}
                  className={`px-6 py-3 font-semibold flex items-center gap-2 rounded-t-lg transition-all ${
                    activeTab === 'geofences'
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Navigation className="w-5 h-5" />
                  Geofences
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                    {activeGeofences}
                  </span>
                </button>
              </div>
              
              {activeTab === 'map' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowGeofences(!showGeofences)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      showGeofences 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {showGeofences ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    Geofences
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition-all"
                  >
                    {viewMode === 'map' ? <List className="w-4 h-4" /> : <Map className="w-4 h-4" />}
                    {viewMode === 'map' ? 'List View' : 'Map View'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Live Tracking Tab */}
            {activeTab === 'map' && (
              <div>
                {viewMode === 'map' ? (
                  <div className="mb-4">
                    <FleetMap 
                      locations={locations.map(loc => ({
                        ...loc,
                        licensePlate: getVehicleInfo(loc.vehicleId)
                      }))}
                      geofences={geofences}
                      showGeofences={showGeofences}
                      height="600px"
                      onVehicleClick={(vehicleId) => {
                        window.location.href = `/hq/fleet/vehicles/${vehicleId}`;
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {locations.map(location => (
                      <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{getVehicleInfo(location.vehicleId)}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(location.timestamp).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {location.isMoving && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              Moving
                            </span>
                          )}
                          {location.isIdle && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Idle {location.idleDurationMinutes}m
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="text-sm font-medium text-gray-900">
                            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Speed</p>
                          <p className="text-sm font-medium text-gray-900">{location.speedKmh} km/h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Heading</p>
                          <p className="text-sm font-medium text-gray-900">{location.heading}°</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Accuracy</p>
                          <p className="text-sm font-medium text-gray-900">{location.accuracyMeters}m</p>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div>
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <div key={alert.id} className={`border rounded-lg p-4 ${
                      alert.severity === 'critical' ? 'border-red-300 bg-red-50' :
                      alert.severity === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                      'border-blue-300 bg-blue-50'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            alert.severity === 'critical' ? 'bg-red-200' :
                            alert.severity === 'warning' ? 'bg-yellow-200' :
                            'bg-blue-200'
                          }`}>
                            <AlertCircle className={`w-5 h-5 ${
                              alert.severity === 'critical' ? 'text-red-700' :
                              alert.severity === 'warning' ? 'text-yellow-700' :
                              'text-blue-700'
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{alert.message}</h3>
                            <p className="text-sm text-gray-600">
                              {getVehicleInfo(alert.vehicleId)} • {new Date(alert.timestamp).toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                        {alert.acknowledged ? (
                          <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Acknowledged
                          </span>
                        ) : (
                          <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700">
                            Acknowledge
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Type</p>
                          <p className="font-medium">{alert.alertType.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Location</p>
                          <p className="font-medium">{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</p>
                        </div>
                        {alert.speedKmh !== null && (
                          <div>
                            <p className="text-gray-600">Speed</p>
                            <p className="font-medium">{alert.speedKmh} km/h</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Geofences Tab */}
            {activeTab === 'geofences' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">{geofences.length} geofences configured</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Add Geofence
                  </button>
                </div>

                <div className="space-y-3">
                  {geofences.map(fence => (
                    <div key={fence.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{fence.name}</h3>
                          <p className="text-sm text-gray-600">{fence.description}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full ${
                          fence.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {fence.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Type</p>
                          <p className="font-medium">{fence.fenceType}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Center</p>
                          <p className="font-medium">{fence.centerLatitude.toFixed(4)}, {fence.centerLongitude.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Radius</p>
                          <p className="font-medium">{fence.radiusMeters}m</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Alerts</p>
                          <div className="flex gap-2">
                            {fence.alertOnEntry && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Entry</span>
                            )}
                            {fence.alertOnExit && (
                              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">Exit</span>
                            )}
                          </div>
                        </div>
                      </div>
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
