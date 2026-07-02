import React, { useState, useEffect } from 'react';
import { X, Truck, Calendar, DollarSign, FileText, Loader } from 'lucide-react';

interface VehicleFormModalProps {
  vehicle?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VehicleFormModal({ vehicle, onClose, onSuccess }: VehicleFormModalProps) {
  const isEdit = !!vehicle;
  const [formData, setFormData] = useState({
    licensePlate: vehicle?.licensePlate || '',
    vehicleType: vehicle?.vehicleType || 'van',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    color: vehicle?.color || '',
    ownershipType: vehicle?.ownershipType || 'owned',
    purchaseDate: vehicle?.purchaseDate || '',
    purchasePrice: vehicle?.purchasePrice || '',
    leaseStartDate: vehicle?.leaseStartDate || '',
    leaseEndDate: vehicle?.leaseEndDate || '',
    leaseMonthlyCost: vehicle?.leaseMonthlyCost || '',
    maxWeightKg: vehicle?.maxWeightKg || '',
    maxVolumeM3: vehicle?.maxVolumeM3 || '',
    fuelTankCapacity: vehicle?.fuelTankCapacity || '',
    registrationNumber: vehicle?.registrationNumber || '',
    registrationExpiry: vehicle?.registrationExpiry || '',
    insurancePolicyNumber: vehicle?.insurancePolicyNumber || '',
    insuranceProvider: vehicle?.insuranceProvider || '',
    insuranceExpiry: vehicle?.insuranceExpiry || '',
    currentLocation: vehicle?.currentLocation || '',
    notes: vehicle?.notes || ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.licensePlate || !formData.vehicleType) {
      setError('License plate dan vehicle type harus diisi');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const url = isEdit 
        ? `/api/fleet/vehicles/${vehicle.id}`
        : '/api/fleet/vehicles';
      
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
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {isEdit ? 'Edit Kendaraan' : 'Tambah Kendaraan Baru'}
              </h2>
              <p className="text-sm text-blue-100">
                {isEdit ? `Edit data ${vehicle.licensePlate}` : 'Isi data kendaraan lengkap'}
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

          {/* Basic Info */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Informasi Dasar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Plat <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData(prev => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="B 1234 XYZ"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Kendaraan <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="truck">Truk</option>
                  <option value="van">Van</option>
                  <option value="motorcycle">Motor</option>
                  <option value="car">Mobil</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Merk</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Mitsubishi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Colt Diesel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tahun</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1990"
                  max={new Date().getFullYear() + 1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Warna</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Putih"
                />
              </div>
            </div>
          </div>

          {/* Ownership */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Kepemilikan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Kepemilikan <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.ownershipType}
                  onChange={(e) => setFormData(prev => ({ ...prev, ownershipType: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="owned">Milik Sendiri</option>
                  <option value="leased">Sewa</option>
                  <option value="rental">Rental</option>
                </select>
              </div>

              {formData.ownershipType === 'owned' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Pembelian
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harga Pembelian (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="350000000"
                    />
                  </div>
                </>
              )}

              {formData.ownershipType === 'leased' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Mulai Sewa
                    </label>
                    <input
                      type="date"
                      value={formData.leaseStartDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, leaseStartDate: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Akhir Sewa
                    </label>
                    <input
                      type="date"
                      value={formData.leaseEndDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, leaseEndDate: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Biaya Sewa Bulanan (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.leaseMonthlyCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, leaseMonthlyCost: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="15000000"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Capacity */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Kapasitas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Berat Maksimal (kg)
                </label>
                <input
                  type="number"
                  value={formData.maxWeightKg}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxWeightKg: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="5000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volume Maksimal (m³)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.maxVolumeM3}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxVolumeM3: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="15"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kapasitas Tangki (L)
                </label>
                <input
                  type="number"
                  value={formData.fuelTankCapacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, fuelTankCapacity: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                />
              </div>
            </div>
          </div>

          {/* Documentation */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Dokumen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor STNK
                </label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="STNK-001-2022"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Kadaluarsa STNK
                </label>
                <input
                  type="date"
                  value={formData.registrationExpiry}
                  onChange={(e) => setFormData(prev => ({ ...prev, registrationExpiry: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Polis Asuransi
                </label>
                <input
                  type="text"
                  value={formData.insurancePolicyNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, insurancePolicyNumber: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="INS-VH-001-2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider Asuransi
                </label>
                <input
                  type="text"
                  value={formData.insuranceProvider}
                  onChange={(e) => setFormData(prev => ({ ...prev, insuranceProvider: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Asuransi Sinar Mas"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Kadaluarsa Asuransi
                </label>
                <input
                  type="date"
                  value={formData.insuranceExpiry}
                  onChange={(e) => setFormData(prev => ({ ...prev, insuranceExpiry: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Informasi Tambahan</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lokasi Saat Ini
                </label>
                <input
                  type="text"
                  value={formData.currentLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentLocation: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Gudang Pusat Cikarang"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Catatan tambahan tentang kendaraan..."
                />
              </div>
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
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
