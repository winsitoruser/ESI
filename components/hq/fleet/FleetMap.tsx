import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Activity, Clock, Zap, AlertTriangle } from 'lucide-react';

interface VehicleLocation {
  id: string;
  vehicleId: string;
  licensePlate: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  isMoving: boolean;
  isIdle: boolean;
  idleDurationMinutes?: number;
  timestamp: string;
}

interface Geofence {
  id: string;
  name: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  fenceType: string;
  status: string;
}

interface FleetMapProps {
  locations: VehicleLocation[];
  geofences?: Geofence[];
  showGeofences?: boolean;
  height?: string;
  onVehicleClick?: (vehicleId: string) => void;
}

export default function FleetMap({ 
  locations, 
  geofences = [], 
  showGeofences = false,
  height = '600px',
  onVehicleClick 
}: FleetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [L, setL] = useState<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<any[]>([]);
  const geofenceLayersRef = useRef<any[]>([]);
  const mapInstanceRef = useRef<any>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        setL(leaflet.default);
      });
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    try {
      // Create map centered on Indonesia
      const newMap = L.map(mapRef.current).setView([-6.2088, 106.8456], 12);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(newMap);

      // Wait for map to be ready
      newMap.whenReady(() => {
        mapInstanceRef.current = newMap;
        setMap(newMap);
        setMapReady(true);
      });

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          setMapReady(false);
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [L]);

  // Update vehicle markers
  useEffect(() => {
    if (!map || !L || !mapReady || !locations.length) return;
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create custom icons
    const createVehicleIcon = (isMoving: boolean, isIdle: boolean) => {
      const color = isMoving ? '#10b981' : isIdle ? '#f59e0b' : '#6b7280';
      const iconHtml = `
        <div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M5 17h14v-5H5v5zm0 0v2a2 2 0 002 2h10a2 2 0 002-2v-2M5 17V7a2 2 0 012-2h10a2 2 0 012 2v10"/>
            <circle cx="9" cy="19" r="1" fill="white"/>
            <circle cx="15" cy="19" r="1" fill="white"/>
          </svg>
        </div>
      `;

      return L.divIcon({
        html: iconHtml,
        className: 'custom-vehicle-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
    };

    // Add markers for each vehicle
    try {
      locations.forEach(location => {
        if (!location.latitude || !location.longitude) return;
        
        const icon = createVehicleIcon(location.isMoving, location.isIdle);
        
        const marker = L.marker([location.latitude, location.longitude], { icon });
        
        if (mapInstanceRef.current) {
          marker.addTo(mapInstanceRef.current);
        }

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">
            ${location.licensePlate}
          </div>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <span style="
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
              background: ${location.isMoving ? '#d1fae5' : location.isIdle ? '#fef3c7' : '#f3f4f6'};
              color: ${location.isMoving ? '#065f46' : location.isIdle ? '#92400e' : '#374151'};
            ">
              ${location.isMoving ? '🚗 Moving' : location.isIdle ? '⏸️ Idle' : '⏹️ Stopped'}
            </span>
          </div>
          <div style="font-size: 13px; color: #6b7280; margin-top: 8px;">
            <div style="margin-bottom: 4px;">
              <strong>Speed:</strong> ${location.speedKmh} km/h
            </div>
            <div style="margin-bottom: 4px;">
              <strong>Heading:</strong> ${location.heading}°
            </div>
            ${location.isIdle ? `
              <div style="margin-bottom: 4px;">
                <strong>Idle Time:</strong> ${location.idleDurationMinutes} min
              </div>
            ` : ''}
            <div style="margin-bottom: 4px;">
              <strong>Last Update:</strong><br/>
              ${new Date(location.timestamp).toLocaleString('id-ID')}
            </div>
          </div>
          ${onVehicleClick ? `
            <button 
              onclick="window.handleVehicleClick('${location.vehicleId}')"
              style="
                margin-top: 8px;
                width: 100%;
                padding: 6px 12px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
              "
            >
              View Details
            </button>
          ` : ''}
        </div>
      `;

        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
      });
    } catch (error) {
      console.error('Error adding markers:', error);
    }

    // Fit bounds to show all markers
    try {
      if (locations.length > 0 && mapInstanceRef.current) {
        const validLocations = locations.filter(l => l.latitude && l.longitude);
        if (validLocations.length > 0) {
          const bounds = L.latLngBounds(validLocations.map(l => [l.latitude, l.longitude]));
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    } catch (error) {
      console.error('Error fitting bounds:', error);
    }

    // Setup click handler
    if (onVehicleClick) {
      (window as any).handleVehicleClick = onVehicleClick;
    }

  }, [map, L, mapReady, locations, onVehicleClick]);

  // Update geofences
  useEffect(() => {
    if (!map || !L || !mapReady || !showGeofences) return;
    if (!mapInstanceRef.current) return;

    // Clear existing geofences
    geofenceLayersRef.current.forEach(layer => layer.remove());
    geofenceLayersRef.current = [];

    // Add geofence circles
    try {
      geofences.forEach(fence => {
        if (fence.status === 'active' && fence.centerLatitude && fence.centerLongitude) {
          const circle = L.circle([fence.centerLatitude, fence.centerLongitude], {
            radius: fence.radiusMeters,
            color: '#8b5cf6',
            fillColor: '#8b5cf6',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5'
          });
          
          if (mapInstanceRef.current) {
            circle.addTo(mapInstanceRef.current);
          }

        const popupContent = `
          <div style="min-width: 180px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #1f2937;">
              ${fence.name}
            </div>
            <div style="font-size: 12px; color: #6b7280;">
              <div><strong>Type:</strong> ${fence.fenceType}</div>
              <div><strong>Radius:</strong> ${fence.radiusMeters}m</div>
            </div>
          </div>
        `;

          circle.bindPopup(popupContent);
          geofenceLayersRef.current.push(circle);
        }
      });
    } catch (error) {
      console.error('Error adding geofences:', error);
    }

  }, [map, L, mapReady, geofences, showGeofences]);

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        style={{ height, width: '100%' }}
        className="rounded-xl overflow-hidden shadow-lg border-2 border-gray-200"
      />
      
      {/* Loading State */}
      {!mapReady && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-[2000] rounded-xl">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700 font-medium">Loading map...</p>
          </div>
        </div>
      )}
      
      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
        <h4 className="font-semibold text-sm text-gray-900 mb-3">Legend</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow"></div>
            <span className="text-xs text-gray-700">Moving</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow"></div>
            <span className="text-xs text-gray-700">Idle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow"></div>
            <span className="text-xs text-gray-700">Stopped</span>
          </div>
          {showGeofences && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
              <div className="w-4 h-4 rounded-full border-2 border-purple-500 border-dashed"></div>
              <span className="text-xs text-gray-700">Geofence</span>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Count */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 z-[1000]">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">
            {locations.length} Vehicle{locations.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Loading Leaflet CSS */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        
        .leaflet-container {
          font-family: inherit;
        }
        
        .custom-vehicle-marker {
          background: transparent;
          border: none;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .leaflet-popup-content {
          margin: 12px;
        }
      `}</style>
    </div>
  );
}
