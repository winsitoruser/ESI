import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

export interface GpsPoint {
  latitude: number;
  longitude: number;
  speed_kmh?: number;
  heading?: number;
  timestamp?: string;
  is_moving?: boolean;
  is_idle?: boolean;
}

export interface TripStop {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  type?: 'start' | 'end' | 'waypoint';
}

interface DriverMapProps {
  current?: GpsPoint | null;
  trail?: GpsPoint[];
  stops?: TripStop[];
  startLocation?: { name: string; lat: number; lng: number } | null;
  endLocation?:   { name: string; lat: number; lng: number } | null;
  height?: string;
  autoFit?: boolean;
  showLegend?: boolean;
}

/**
 * Lightweight Leaflet map for the driver/armada portal.
 * Renders:
 *   - Driver current position (blue pulsing marker w/ heading arrow)
 *   - Historical trail (polyline) from `trail`
 *   - Route stops with small labeled markers
 *   - Start (green flag) & end (red flag) markers
 */
export default function DriverMap({
  current,
  trail = [],
  stops = [],
  startLocation,
  endLocation,
  height = '100%',
  autoFit = true,
  showLegend = true,
}: DriverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);

  // Load Leaflet on the client only
  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet').then((mod) => setL(mod.default));
  }, []);

  // Init map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;
    try {
      const center: [number, number] =
        current ? [current.latitude, current.longitude]
        : startLocation ? [startLocation.lat, startLocation.lng]
        : [-6.2088, 106.8456];

      const m = L.map(mapRef.current, { zoomControl: true, attributionControl: true })
        .setView(center, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(m);

      m.whenReady(() => {
        mapInstanceRef.current = m;
        setMapReady(true);
      });
    } catch (e) {
      console.error('[DriverMap] init error', e);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [L]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw layers
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !mapReady) return;
    const map = mapInstanceRef.current;

    // Clear previous
    layersRef.current.forEach((l) => { try { l.remove(); } catch {} });
    layersRef.current = [];

    const latLngs: [number, number][] = [];

    // Trail polyline
    if (trail.length > 1) {
      const coords = trail.map((p) => [p.latitude, p.longitude] as [number, number]);
      const poly = L.polyline(coords, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.75,
        lineJoin: 'round',
      }).addTo(map);
      layersRef.current.push(poly);
      latLngs.push(...coords);
    }

    // Start marker (green flag)
    if (startLocation) {
      const icon = L.divIcon({
        className: 'driver-map-icon',
        html: flagSvg('#16a34a', 'S'),
        iconSize: [28, 34],
        iconAnchor: [4, 32],
      });
      const m = L.marker([startLocation.lat, startLocation.lng], { icon })
        .bindPopup(`<b>Mulai</b><br/>${escape(startLocation.name)}`)
        .addTo(map);
      layersRef.current.push(m);
      latLngs.push([startLocation.lat, startLocation.lng]);
    }

    // End marker (red flag)
    if (endLocation) {
      const icon = L.divIcon({
        className: 'driver-map-icon',
        html: flagSvg('#dc2626', 'E'),
        iconSize: [28, 34],
        iconAnchor: [4, 32],
      });
      const m = L.marker([endLocation.lat, endLocation.lng], { icon })
        .bindPopup(`<b>Selesai</b><br/>${escape(endLocation.name)}`)
        .addTo(map);
      layersRef.current.push(m);
      latLngs.push([endLocation.lat, endLocation.lng]);
    }

    // Stop markers
    stops.forEach((s, i) => {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number') return;
      const icon = L.divIcon({
        className: 'driver-map-icon',
        html: stopSvg('#f59e0b', String(i + 1)),
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      const marker = L.marker([s.lat, s.lng], { icon })
        .bindPopup(`<b>Stop ${i + 1}: ${escape(s.name)}</b>${s.address ? `<br/><span style="color:#6b7280">${escape(s.address)}</span>` : ''}`)
        .addTo(map);
      layersRef.current.push(marker);
      latLngs.push([s.lat, s.lng]);
    });

    // Current driver marker (pulsing, with heading arrow)
    if (current && typeof current.latitude === 'number' && typeof current.longitude === 'number') {
      const icon = L.divIcon({
        className: 'driver-map-icon',
        html: driverSvg(current.heading || 0, current.is_moving !== false),
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const m = L.marker([current.latitude, current.longitude], { icon })
        .bindPopup(
          `<div style="min-width:160px">
             <b>Posisi Saya</b><br/>
             <span style="color:#6b7280;font-size:12px">
               ${current.speed_kmh ? `${Math.round(current.speed_kmh)} km/j` : 'Diam'}
               ${current.heading ? ` · ${Math.round(current.heading)}°` : ''}
             </span>
             ${current.timestamp ? `<div style="color:#9ca3af;font-size:10px;margin-top:4px">${new Date(current.timestamp).toLocaleString('id-ID')}</div>` : ''}
           </div>`
        )
        .addTo(map);
      layersRef.current.push(m);
      latLngs.push([current.latitude, current.longitude]);
    }

    // Fit bounds
    if (autoFit && latLngs.length > 0) {
      try {
        if (latLngs.length === 1) map.setView(latLngs[0], 14);
        else map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
      } catch {}
    }
  }, [L, mapReady, current, trail, stops, startLocation, endLocation, autoFit]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} style={{ height, width: '100%', minHeight: 300 }} className="rounded-xl overflow-hidden z-0" />
      {!mapReady && (
        <div className="absolute inset-0 bg-white/85 flex items-center justify-center z-[500] rounded-xl">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Memuat peta...</p>
          </div>
        </div>
      )}

      {showLegend && mapReady && (
        <div className="absolute bottom-2 left-2 z-[800] bg-white/95 rounded-lg shadow-md px-2.5 py-2 text-[10px] text-gray-700 space-y-1 leading-tight">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Posisi</div>
          {trail.length > 1 && <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500" /> Jejak</div>}
          {stops.length > 0 && <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Stop</div>}
          {startLocation && <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-600" /> Mulai</div>}
          {endLocation && <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-600" /> Selesai</div>}
        </div>
      )}

      {/* Leaflet CSS */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        .driver-map-icon { background: transparent; border: none; }
        .leaflet-container { font-family: inherit; border-radius: 12px; }
        .leaflet-popup-content-wrapper { border-radius: 10px; }
        .leaflet-popup-content { margin: 10px 12px; font-size: 12px; }
        @keyframes driver-pulse {
          0%   { transform: scale(1);   opacity: 0.85; }
          70%  { transform: scale(1.9); opacity: 0;    }
          100% { transform: scale(1);   opacity: 0;    }
        }
        .driver-pulse-ring {
          position: absolute; top: 50%; left: 50%;
          width: 36px; height: 36px; margin: -18px 0 0 -18px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.35);
          animation: driver-pulse 1.6s ease-out infinite;
        }
      `}</style>
    </div>
  );
}

/* ---------- helpers ---------- */
function escape(s: string) {
  return String(s || '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

function driverSvg(heading: number, moving: boolean) {
  const color = moving ? '#2563eb' : '#6b7280';
  return `
    <div style="position:relative;width:44px;height:44px;">
      <span class="driver-pulse-ring"></span>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(${heading}deg);">
        <div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 22 12 18 5 22 12 2"/>
          </svg>
        </div>
      </div>
    </div>`;
}

function stopSvg(color: string, label: string) {
  return `
    <div style="width:26px;height:26px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;font-family:sans-serif;">
      ${label}
    </div>`;
}

function flagSvg(color: string, label: string) {
  return `
    <div style="position:relative;width:28px;height:34px;">
      <div style="position:absolute;left:4px;bottom:0;width:2px;height:34px;background:#111;"></div>
      <div style="position:absolute;left:6px;top:0;width:22px;height:16px;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;border-radius:2px;">
        ${label}
      </div>
    </div>`;
}
