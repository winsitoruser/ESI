import React, { useState, useEffect } from 'react';
import { User, Phone, Award, TrendingUp, Loader } from 'lucide-react';

interface Driver {
  id: string;
  driverNumber: string;
  fullName: string;
  phone: string;
  licenseType: string;
  licenseNumber: string;
  totalDeliveries: number;
  onTimeDeliveries: number;
  safetyScore: number;
  customerRating: number;
}

interface DriverSelectorProps {
  value: string | null;
  onChange: (driver: Driver | null) => void;
  branch?: string;
  licenseType?: string;
}

export default function DriverSelector({ value, onChange, branch, licenseType }: DriverSelectorProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAvailableDrivers();
  }, [branch, licenseType]);

  const fetchAvailableDrivers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branch) params.append('branch', branch);
      if (licenseType) params.append('licenseType', licenseType);

      const response = await fetch(`/api/fleet/drivers/available?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDrivers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedDriver = drivers.find(d => d.id === value);

  const filteredDrivers = drivers.filter(driver =>
    driver.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.driverNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateOnTimeRate = (driver: Driver) => {
    if (driver.totalDeliveries === 0) return 0;
    return Math.round((driver.onTimeDeliveries / driver.totalDeliveries) * 100);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <User className="w-4 h-4 inline mr-1" />
        Pilih Driver
      </label>

      {/* Selected Driver Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left hover:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {selectedDriver ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{selectedDriver.fullName}</div>
              <div className="text-sm text-gray-500">
                {selectedDriver.driverNumber} • {selectedDriver.licenseType}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">{selectedDriver.phone}</div>
              <div className="text-xs text-green-600">
                {calculateOnTimeRate(selectedDriver)}% on-time
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400">Pilih driver tersedia...</div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Cari driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Driver List */}
          <div className="overflow-y-auto max-h-80">
            {loading ? (
              <div className="p-8 text-center">
                <Loader className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Memuat driver...</p>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="p-8 text-center">
                <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-600">Tidak ada driver tersedia</p>
              </div>
            ) : (
              filteredDrivers.map((driver) => (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => {
                    onChange(driver);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full p-4 text-left hover:bg-blue-50 border-b border-gray-100 transition-colors ${
                    value === driver.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{driver.fullName}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {driver.driverNumber} • {driver.licenseType}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <Phone className="w-3 h-3" />
                        {driver.phone}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <TrendingUp className="w-3 h-3" />
                        {driver.totalDeliveries} trips
                      </div>
                      <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                        <Award className="w-3 h-3" />
                        {calculateOnTimeRate(driver)}% on-time
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Safety: {driver.safetyScore}
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
