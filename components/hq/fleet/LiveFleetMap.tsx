import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface FleetMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  sublabel?: string;
  heading?: number;
  speed_kmh?: number;
  is_moving?: boolean;
  is_idle?: boolean;
  license_plate?: string;
}

export interface FleetRouteStop {
  name?: string;
  lat: number;
  lng: number;
  type?: 'start' | 'stop' | 'end';
}

export interface FleetRouteOverlay {
  plannedStops?: FleetRouteStop[];       // stops+start+end (ditampilkan sebagai pin biru berurut)
  plannedPath?: [number, number][];      // optional polyline rencana
  actualPath?: [number, number][];       // actual GPS trail
  label?: string;
}

interface Props {
  markers: FleetMapMarker[];
  height?: string | number;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  autoFit?: boolean;
  route?: FleetRouteOverlay | null;      // optional overlay for selected driver
}

/**
 * Live multi-marker Leaflet map untuk HQ dispatcher.
 * SSR-safe (dynamic import leaflet di client).
 */
export default function LiveFleetMap({ markers, height = 520, onSelect, selectedId, autoFit = true, route }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const markerMapRef = useRef<Record<string, any>>({});
  const overlayRef = useRef<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet').then((mod) => setL(mod.default));
  }, []);

  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;
    const center: [number, number] =
      markers[0] ? [markers[0].latitude, markers[0].longitude] : [-6.2088, 106.8456];
    const m = L.map(mapRef.current).setView(center, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(m);
    m.whenReady(() => { mapInstanceRef.current = m; setReady(true); });
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setReady(false);
      }
    };
  }, [L]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render / update markers
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !ready) return;
    const map = mapInstanceRef.current;
    const existing = markerMapRef.current;
    const nextIds = new Set<string>();

    markers.forEach((m) => {
      nextIds.add(m.id);
      const icon = L.divIcon({
        className: 'hq-fleet-icon',
        html: markerSvg(m.heading || 0, m.is_moving !== false, m.id === selectedId),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      if (existing[m.id]) {
        existing[m.id].setLatLng([m.latitude, m.longitude]).setIcon(icon);
        existing[m.id].setPopupContent(popupHtml(m));
      } else {
        const marker = L.marker([m.latitude, m.longitude], { icon })
          .bindPopup(popupHtml(m))
          .addTo(map);
        marker.on('click', () => onSelect?.(m.id));
        existing[m.id] = marker;
      }
    });

    // Remove stale markers
    Object.keys(existing).forEach((id) => {
      if (!nextIds.has(id)) {
        try { existing[id].remove(); } catch {}
        delete existing[id];
      }
    });

    // Fit bounds
    if (autoFit && markers.length > 0) {
      try {
        if (markers.length === 1) map.setView([markers[0].latitude, markers[0].longitude], 13);
        else {
          const b = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude] as [number, number]));
          map.fitBounds(b, { padding: [50, 50] });
        }
      } catch {}
    }
  }, [L, ready, markers, selectedId, autoFit, onSelect]);

  // Render route overlay (plannedStops / plannedPath / actualPath)
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !ready) return;
    const map = mapInstanceRef.current;

    // Clear previous overlays
    overlayRef.current.forEach((layer) => { try { map.removeLayer(layer); } catch {} });
    overlayRef.current = [];

    if (!route) return;

    const addLayer = (layer: any) => { layer.addTo(map); overlayRef.current.push(layer); };

    const stops = route.plannedStops || [];
    const allPts: [number, number][] = [];

    // Planned path polyline
    const planned = route.plannedPath && route.plannedPath.length > 1
      ? route.plannedPath
      : stops.length > 1
        ? stops.map((s) => [s.lat, s.lng] as [number, number])
        : null;

    if (planned && planned.length > 1) {
      const line = L.polyline(planned, { color: '#2563eb', weight: 4, opacity: 0.55, dashArray: '8,6' });
      addLayer(line);
      planned.forEach((p) => allPts.push(p));
    }

    // Actual path polyline
    if (route.actualPath && route.actualPath.length > 1) {
      const actual = L.polyline(route.actualPath, { color: '#059669', weight: 5, opacity: 0.85 });
      addLayer(actual);
      route.actualPath.forEach((p) => allPts.push(p));
    }

    // Stop pins (start = green, end = red, middle = orange)
    stops.forEach((s, i) => {
      const isStart = s.type === 'start' || i === 0;
      const isEnd   = s.type === 'end'   || i === stops.length - 1;
      const color   = isStart ? '#059669' : isEnd ? '#dc2626' : '#f59e0b';
      const icon = L.divIcon({
        className: 'hq-stop-icon',
        html: `<div style="background:${color};color:#fff;width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">${isStart ? 'S' : isEnd ? 'E' : i}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const m = L.marker([s.lat, s.lng], { icon }).bindTooltip(s.name || (isStart ? 'Start' : isEnd ? 'Tujuan' : `Stop ${i}`));
      addLayer(m);
      allPts.push([s.lat, s.lng]);
    });

    // Fit to overlay if provided and autoFit
    if (autoFit && allPts.length > 1) {
      try {
        const b = L.latLngBounds(allPts);
        map.fitBounds(b, { padding: [60, 60] });
      } catch {}
    }
  }, [L, ready, route, autoFit]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} style={{ height, width: '100%', minHeight: 300 }} className="rounded-xl overflow-hidden z-0" />
      {!ready && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[500] rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        .hq-fleet-icon { background: transparent; border: none; }
        .leaflet-container { font-family: inherit; border-radius: 12px; }
        .leaflet-popup-content-wrapper { border-radius: 10px; }
        .leaflet-popup-content { margin: 10px 12px; font-size: 12px; }
      `}</style>
    </div>
  );
}

function popupHtml(m: FleetMapMarker) {
  return `<div style="min-width:160px">
    <b>${esc(m.label)}</b>
    ${m.sublabel ? `<br/><span style="color:#6b7280">${esc(m.sublabel)}</span>` : ''}
    ${m.license_plate ? `<br/><span style="color:#6b7280;font-size:11px">${esc(m.license_plate)}</span>` : ''}
    <div style="margin-top:4px;font-size:11px;color:${m.is_moving ? '#2563eb' : '#6b7280'};">
      ${m.is_moving ? (m.speed_kmh ? Math.round(m.speed_kmh) + ' km/j' : 'Bergerak') : 'Diam'}
    </div>
  </div>`;
}

function esc(s: string) {
  return String(s || '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

function markerSvg(heading: number, moving: boolean, highlight: boolean) {
  const color = moving ? '#2563eb' : '#6b7280';
  const ring = highlight ? '<circle cx="20" cy="20" r="17" fill="none" stroke="#f59e0b" stroke-width="2" />' : '';
  return `<svg width="40" height="40" viewBox="0 0 40 40">
    ${ring}
    <g transform="rotate(${heading} 20 20)">
      <circle cx="20" cy="20" r="13" fill="${color}" stroke="#fff" stroke-width="3" />
      <polygon points="20,8 28,28 20,24 12,28" fill="#fff" />
    </g>
  </svg>`;
}
