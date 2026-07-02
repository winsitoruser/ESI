import React, { useState, useEffect } from 'react';
import { Truck, Package, Gauge, MapPin, Loader } from 'lucide-react';

interface Vehicle {
  id: string;
  vehicleNumber: string;
  licensePlate: string;
  vehicleType: string;
  brand: string;
  model: string;
  maxWeightKg: number;
  maxVolumeM3: number;
  fuelTankCapacity: number;
  currentOdometerKm: number;
  currentLocation: string;
}

interface VehicleSelectorProps {
  value: string | null;
  onChange: (vehicle: Vehicle | null) => void;
  branch?: string;
  vehicleType?: string;
  minCapacity?: number;
}

export default function VehicleSelector({ value, onChange, branch, vehicleType, minCapacity }: VehicleSelectorProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAvailableVehicles();
  }, [branch, vehicleType, minCapacity]);

  const fetchAvailableVehicles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branch) params.append('branch', branch);
      if (vehicleType) params.append('vehicleType', vehicleType);
      if (minCapacity) params.append('minCapacity', minCapacity.toString());

      const response = await fetch(`/api/fleet/vehicles/available?${params}`);
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === value);

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getVehicleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      truck: 'Truk',
      van: 'Van',
      motorcycle: 'Motor',
      car: 'Mobil'
    };
    return labels[type] || type;
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Truck className="w-4 h-4 inline mr-1" />
        Pilih Kendaraan
      </label>

      {/* Selected Vehicle Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left hover:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {selectedVehicle ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{selectedVehicle.licensePlate}</div>
              <div className="text-sm text-gray-500">
                {selectedVehicle.brand} {selectedVehicle.model} • {getVehicleTypeLabel(selectedVehicle.vehicleType)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                {selectedVehicle.maxWeightKg} kg
              </div>
              <div className="text-xs text-gray-500">
                {selectedVehicle.currentOdometerKm.toLocaleString()} km
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400">Pilih kendaraan tersedia...</div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Cari kendaraan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Vehicle List */}
          <div className="overflow-y-auto max-h-80">
            {loading ? (
              <div className="p-8 text-center">
                <Loader className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Memuat kendaraan...</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="p-8 text-center">
                <Truck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-600">Tidak ada kendaraan tersedia</p>
              </div>
            ) : (
              filteredVehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => {
                    onChange(vehicle);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full p-4 text-left hover:bg-blue-50 border-b border-gray-100 transition-colors ${
                    value === vehicle.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{vehicle.licensePlate}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {vehicle.brand} {vehicle.model}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {getVehicleTypeLabel(vehicle.vehicleType)}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="w-3 h-3" />
                          {vehicle.currentLocation}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Package className="w-3 h-3" />
                        {vehicle.maxWeightKg} kg
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {vehicle.maxVolumeM3} m³
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Gauge className="w-3 h-3" />
                        {vehicle.currentOdometerKm.toLocaleString()} km
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
