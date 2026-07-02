/**
 * HQ — Live Fleet Dashboard
 *
 * Real-time monitoring armada + driver dari sisi operator / dispatcher.
 * Data: GET /api/hq/fleet/live (polling 10 dtk)
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import HQLayout from '../../../components/hq/HQLayout';
import {
  RefreshCw, Activity, Clock, Truck, User, Phone, Navigation,
  MapPin, AlertCircle, CheckCircle, Search, Filter, Star, Shield,
  ChevronRight, Pause, Play, Loader2, Zap,
} from 'lucide-react';

const LiveFleetMap = dynamic(
  () => import('../../../components/hq/fleet/LiveFleetMap'),
  { ssr: false, loading: () => <div className="h-full bg-gray-100 animate-pulse rounded-xl" /> }
);

interface LiveDriver {
  driver_id: string;
  driver_number: string;
  full_name: string;
  phone?: string;
  availability_status: 'on_duty' | 'available' | 'off_duty';
  customer_rating?: number;
  safety_score?: number;
  branch_name?: string;
  vehicle_id?: string;
  vehicle_number?: string;
  license_plate?: string;
  vehicle_type?: string;
  current_odometer_km?: number;
  location?: {
    latitude: number;
    longitude: number;
    speed_kmh: number;
    heading: number;
    timestamp: string;
    is_moving: boolean;
    is_idle: boolean;
    age_seconds: number;
  } | null;
  trips_today?: number;
  completed_today?: number;
  active_trip?: {
    id: string;
    status: string;
    route_number?: string;
    route_name?: string;
    start_location?: string;
    end_location?: string;
    route_distance_km?: number;
  } | null;
}

const AVAIL_LABELS: Record<string, { label: string; color: string }> = {
  on_duty:   { label: 'Bertugas',     color: 'bg-blue-100 text-blue-700' },
  available: { label: 'Siap',         color: 'bg-green-100 text-green-700' },
  off_duty:  { label: 'Off Duty',     color: 'bg-gray-100 text-gray-500' },
};

export default function HQLiveFleetPage() {
  const [mounted, setMounted] = useState(false);
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'any' | 'on_duty' | 'available' | 'off_duty'>('any');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [routeOverlay, setRouteOverlay] = useState<any | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  const fetchLive = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'any') q.set('status', statusFilter);
      const r = await fetch(`/api/hq/fleet/live?${q}`);
      const j = await r.json();
      if (j.success) {
        setDrivers(j.data || []);
        setSummary(j.summary || null);
        setLastUpdated(new Date().toLocaleTimeString('id-ID'));
      }
    } catch (e) {
      console.error('fetch live failed', e);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchLive(); }, [mounted, fetchLive]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchLive, 10_000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchLive]);

  // Fetch route overlay (planned + actual) when a driver is selected
  useEffect(() => {
    if (!selectedId || !showOverlay) { setRouteOverlay(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/hq/fleet/driver-route?driver_id=${encodeURIComponent(selectedId)}`);
        const j = await r.json();
        if (!cancelled && j.success) setRouteOverlay(j.data || null);
      } catch {
        if (!cancelled) setRouteOverlay(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId, showOverlay, lastUpdated]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return drivers.filter((d) =>
      !s || d.full_name?.toLowerCase().includes(s) ||
      d.license_plate?.toLowerCase().includes(s) ||
      d.vehicle_number?.toLowerCase().includes(s) ||
      d.driver_number?.toLowerCase().includes(s)
    );
  }, [drivers, search]);

  const markers = useMemo(
    () =>
      filtered
        .filter((d) => d.location && Number.isFinite(d.location.latitude) && Number.isFinite(d.location.longitude))
        .map((d) => ({
          id: d.driver_id,
          latitude: d.location!.latitude,
          longitude: d.location!.longitude,
          label: d.full_name,
          sublabel: d.active_trip?.route_name || d.active_trip?.end_location,
          heading: d.location!.heading,
          speed_kmh: d.location!.speed_kmh,
          is_moving: d.location!.is_moving,
          is_idle: d.location!.is_idle,
          license_plate: d.license_plate,
        })),
    [filtered]
  );

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.driver_id === selectedId) || null,
    [drivers, selectedId]
  );

  if (!mounted) return null;

  return (
    <HQLayout>
      <Head><title>Live Fleet Tracking · Bedagang HQ</title></Head>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-lg p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Live Fleet Tracking</h1>
                <p className="text-blue-100 text-xs md:text-sm">
                  Monitor real-time driver & kendaraan · update {lastUpdated || '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  autoRefresh ? 'bg-white/20 backdrop-blur-sm' : 'bg-white/5'
                }`}
                title="Toggle auto-refresh tiap 10 detik"
              >
                {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {autoRefresh ? 'Live' : 'Paused'}
              </button>
              <button
                onClick={fetchLive}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 backdrop-blur-sm flex items-center gap-1.5 active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <StatCard icon={<Truck className="w-5 h-5 text-gray-600" />}      label="Driver"     value={summary.total} />
            <StatCard icon={<Activity className="w-5 h-5 text-blue-600" />}   label="Bertugas"   value={summary.on_duty}   accent="blue" />
            <StatCard icon={<CheckCircle className="w-5 h-5 text-green-600" />} label="Siap"     value={summary.available} accent="green" />
            <StatCard icon={<Clock className="w-5 h-5 text-amber-600" />}     label="Off-Duty"   value={summary.off_duty}  accent="amber" />
            <StatCard icon={<Navigation className="w-5 h-5 text-indigo-600" />} label="Bergerak" value={summary.moving}    accent="indigo" />
            <StatCard icon={<MapPin className="w-5 h-5 text-pink-600" />}     label="Tracked"    value={`${summary.with_location}/${summary.total}`} accent="pink" />
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center bg-white rounded-xl border border-gray-200 p-2">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 px-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama / plat / nomor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm bg-transparent focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {(['any', 'on_duty', 'available', 'off_duty'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  statusFilter === s ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                {s === 'any' ? 'Semua' : AVAIL_LABELS[s]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
            <div className="h-[60vh] min-h-[420px]">
              <LiveFleetMap
                markers={markers}
                selectedId={selectedId}
                onSelect={setSelectedId}
                height={'100%'}
                route={selectedId && routeOverlay ? {
                  plannedStops: routeOverlay.plannedStops || [],
                  actualPath: routeOverlay.actualPath || [],
                } : null}
                autoFit={!selectedId}
              />
            </div>
            {selectedId && (
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur rounded-xl shadow-md p-2 flex items-center gap-2 z-[500]">
                <label className="text-[10px] font-semibold text-gray-700 flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} />
                  Overlay rute
                </label>
                {routeOverlay && (
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 border-l border-gray-200 pl-2">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-blue-500" />Rencana</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-emerald-600" />Aktual</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Driver list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                Driver · {filtered.length}
              </h3>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 p-6">
                  {loading ? 'Memuat...' : 'Tidak ada driver yang cocok'}
                </p>
              )}
              {filtered.map((d) => (
                <button
                  key={d.driver_id}
                  onClick={() => setSelectedId(d.driver_id)}
                  className={`w-full text-left p-3 border-b border-gray-50 hover:bg-blue-50/50 transition flex items-start gap-3 ${
                    selectedId === d.driver_id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    d.location?.is_moving ? 'bg-blue-500 text-white' :
                    d.availability_status === 'available' ? 'bg-green-500 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {d.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{d.full_name}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${AVAIL_LABELS[d.availability_status]?.color || ''}`}>
                        {AVAIL_LABELS[d.availability_status]?.label || d.availability_status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">
                      {d.license_plate || d.vehicle_number || '—'}
                      {d.branch_name ? ` · ${d.branch_name}` : ''}
                    </p>
                    {d.active_trip && (
                      <p className="text-[11px] text-blue-600 truncate mt-0.5 flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {d.active_trip.route_name || d.active_trip.end_location}
                      </p>
                    )}
                    {d.location && (
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {d.location.is_moving
                          ? `${Math.round(d.location.speed_kmh)} km/j`
                          : d.location.is_idle ? 'Idle' : 'Diam'}
                        {d.location.age_seconds != null && ` · ${formatAge(d.location.age_seconds)}`}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected driver detail */}
        {selectedDriver && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedDriver.full_name}</h3>
                <p className="text-xs text-gray-500">
                  {selectedDriver.driver_number} · {selectedDriver.license_plate || selectedDriver.vehicle_number} · {selectedDriver.branch_name || '—'}
                </p>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-xs text-gray-400 hover:text-gray-700">Tutup</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              {selectedDriver.phone && (
                <a href={`tel:${selectedDriver.phone}`} className="flex items-center gap-2 bg-blue-50 rounded-xl p-2.5 text-blue-700 text-xs font-semibold">
                  <Phone className="w-4 h-4" /> {selectedDriver.phone}
                </a>
              )}
              <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-2.5 text-amber-700 text-xs font-semibold">
                <Star className="w-4 h-4" /> {selectedDriver.customer_rating?.toFixed(1) || '-'}
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-2.5 text-emerald-700 text-xs font-semibold">
                <Shield className="w-4 h-4" /> {selectedDriver.safety_score?.toFixed(0) || '-'} pt
              </div>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 text-gray-700 text-xs font-semibold">
                <Activity className="w-4 h-4" /> {selectedDriver.completed_today || 0}/{selectedDriver.trips_today || 0} trip
              </div>
            </div>

            {selectedDriver.active_trip && (
              <div className="mt-3 bg-blue-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-semibold text-blue-700">TRIP AKTIF</span>
                  <span className="text-[10px] text-gray-500">{selectedDriver.active_trip.route_number}</span>
                </div>
                <p className="font-semibold text-sm">{selectedDriver.active_trip.route_name}</p>
                <p className="text-xs text-gray-600">
                  {selectedDriver.active_trip.start_location} → {selectedDriver.active_trip.end_location}
                  {selectedDriver.active_trip.route_distance_km ? ` · ${selectedDriver.active_trip.route_distance_km} km` : ''}
                </p>
              </div>
            )}

            {selectedDriver.location && (
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps?q=${selectedDriver.location.latitude},${selectedDriver.location.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl"
                >
                  <MapPin className="w-4 h-4" /> Lihat di Google Maps
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </HQLayout>
  );
}

const ACCENT_BG: Record<string, string> = {
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  amber: 'bg-amber-50',
  indigo: 'bg-indigo-50',
  pink: 'bg-pink-50',
  gray: 'bg-gray-50',
};

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: any; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-2">
      <div className={`p-2 rounded-lg ${ACCENT_BG[accent || 'gray'] || ACCENT_BG.gray}`}>{icon}</div>
      <div>
        <p className="text-[10px] text-gray-500 uppercase">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function formatAge(sec: number) {
  if (sec < 60) return `${sec}s lalu`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m lalu`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}j lalu`;
  return `${Math.floor(sec / 86400)}h lalu`;
}
