import React, { useState, useEffect } from 'react';
import { X, Fuel, Calendar, DollarSign, Loader, MapPin } from 'lucide-react';

interface FuelTransactionModalProps {
  transaction?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FuelTransactionModal({ transaction, onClose, onSuccess }: FuelTransactionModalProps) {
  const isEdit = !!transaction;
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    vehicleId: transaction?.vehicleId || '',
    driverId: transaction?.driverId || '',
    fuelType: transaction?.fuelType || 'diesel',
    quantityLiters: transaction?.quantityLiters || '',
    pricePerLiter: transaction?.pricePerLiter || '',
    totalCost: transaction?.totalCost || '',
    odometerReading: transaction?.odometerReading || '',
    fuelStation: transaction?.fuelStation || '',
    location: transaction?.location || '',
    paymentMethod: transaction?.paymentMethod || 'cash',
    receiptNumber: transaction?.receiptNumber || '',
    transactionDate: transaction?.transactionDate || new Date().toISOString().split('T')[0],
    notes: transaction?.notes || ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehiclesAndDrivers();
  }, []);

  useEffect(() => {
    if (formData.quantityLiters && formData.pricePerLiter) {
      const total = parseFloat(formData.quantityLiters) * parseFloat(formData.pricePerLiter);
      setFormData(prev => ({ ...prev, totalCost: total.toString() }));
    }
  }, [formData.quantityLiters, formData.pricePerLiter]);

  const fetchVehiclesAndDrivers = async () => {
    try {
      const [vehiclesRes, driversRes] = await Promise.all([
        fetch('/api/fleet/vehicles/available'),
        fetch('/api/fleet/drivers/available')
      ]);

      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        setVehicles(vehiclesData.data || []);
      }

      if (driversRes.ok) {
        const driversData = await driversRes.json();
        setDrivers(driversData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicleId || !formData.quantityLiters || !formData.pricePerLiter) {
      setError('Vehicle, quantity, dan price per liter harus diisi');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const url = isEdit 
        ? `/api/fleet/fuel/${transaction.id}`
        : '/api/fleet/fuel';
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Gagal menyimpan data');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-600 to-red-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {isEdit ? 'Edit Transaksi Bahan Bakar' : 'Tambah Transaksi Bahan Bakar'}
              </h2>
              <p className="text-sm text-orange-100">
                {isEdit ? 'Edit data transaksi' : 'Isi data transaksi lengkap'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Vehicle & Driver */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Kendaraan & Driver</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kendaraan <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Pilih Kendaraan</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.licensePlate} - {vehicle.brand} {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver
                </label>
                <select
                  value={formData.driverId}
                  onChange={(e) => setFormData(prev => ({ ...prev, driverId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Pilih Driver</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.fullName} - {driver.driverNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fuel Details */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Detail Bahan Bakar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Bahan Bakar <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.fuelType}
                  onChange={(e) => setFormData(prev => ({ ...prev, fuelType: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="diesel">Diesel</option>
                  <option value="gasoline">Bensin</option>
                  <option value="pertamax">Pertamax</option>
                  <option value="pertalite">Pertalite</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah (Liter) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantityLiters}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantityLiters: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="50.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harga per Liter (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pricePerLiter}
                  onChange={(e) => setFormData(prev => ({ ...prev, pricePerLiter: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="6800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Biaya (Rp)
                </label>
                <input
                  type="number"
                  value={formData.totalCost}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="Auto calculated"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Odometer Reading (km)
                </label>
                <input
                  type="number"
                  value={formData.odometerReading}
                  onChange={(e) => setFormData(prev => ({ ...prev, odometerReading: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="45000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Transaksi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.transactionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, transactionDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Station & Payment */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">SPBU & Pembayaran</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama SPBU
                </label>
                <input
                  type="text"
                  value={formData.fuelStation}
                  onChange={(e) => setFormData(prev => ({ ...prev, fuelStation: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Pertamina SPBU 123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lokasi
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Cikarang, Bekasi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metode Pembayaran
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="cash">Cash</option>
                  <option value="fuel_card">Fuel Card</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Struk
                </label>
                <input
                  type="text"
                  value={formData.receiptNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="RCP-2024-001"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Catatan</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Tambahan
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Catatan tambahan tentang transaksi..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {submitting && <Loader className="w-4 h-4 animate-spin" />}
              {submitting ? 'Menyimpan...' : (isEdit ? 'Update' : 'Simpan')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
