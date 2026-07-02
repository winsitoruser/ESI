import React, { useState } from 'react';
import { X, Truck, User, Phone, Calendar, Package, DollarSign, FileText, Loader } from 'lucide-react';
import DriverSelector from '../fleet/DriverSelector';
import VehicleSelector from '../fleet/VehicleSelector';

interface CreateShipmentModalProps {
  requisition: any;
  onClose: () => void;
  onSuccess: (shipment: any) => void;
}

export default function CreateShipmentModal({ requisition, onClose, onSuccess }: CreateShipmentModalProps) {
  const [formData, setFormData] = useState({
    carrier: 'internal',
    driverName: '',
    driverPhone: '',
    vehicleNumber: '',
    estimatedDeliveryDate: '',
    totalPackages: 1,
    totalWeight: 0,
    totalVolume: 0,
    shippingCost: 0,
    insuranceCost: 0,
    deliveryInstructions: '',
    notes: ''
  });
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.carrier) {
      setError('Carrier harus dipilih');
      return;
    }

    if (formData.carrier === 'internal' && !selectedDriver) {
      setError('Driver harus dipilih untuk pengiriman internal');
      return;
    }

    if (formData.carrier === 'internal' && !selectedVehicle) {
      setError('Kendaraan harus dipilih untuk pengiriman internal');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/hq/requisitions/${requisition.id}/create-shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          driverName: selectedDriver?.fullName || formData.driverName,
          driverPhone: selectedDriver?.phone || formData.driverPhone,
          vehicleNumber: selectedVehicle?.licensePlate || formData.vehicleNumber,
          driverId: selectedDriver?.id,
          vehicleId: selectedVehicle?.id,
          shippedFromBranchId: requisition.fulfillingBranch?.id || '6',
          shippedToBranchId: requisition.requestingBranch?.id || '2'
        })
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess(data.data);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Gagal membuat shipment');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const carriers = [
    { value: 'internal', label: 'Internal Delivery' },
    { value: 'JNE', label: 'JNE' },
    { value: 'JNT', label: 'J&T Express' },
    { value: 'SiCepat', label: 'SiCepat' },
    { value: 'AnterAja', label: 'AnterAja' },
    { value: 'other', label: 'Lainnya' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Buat Shipment</h2>
              <p className="text-sm text-blue-100">{requisition.irNumber}</p>
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

          {/* Requisition Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Dari</p>
                <p className="font-medium">{requisition.fulfillingBranch?.name || 'Belum ditentukan'}</p>
              </div>
              <div>
                <p className="text-gray-600">Ke</p>
                <p className="font-medium">{requisition.requestingBranch?.name}</p>
              </div>
            </div>
          </div>

          {/* Carrier Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Pilih Carrier <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {carriers.map(carrier => (
                <button
                  key={carrier.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, carrier: carrier.value }))}
                  className={`p-3 border-2 rounded-lg text-center transition-all ${
                    formData.carrier === carrier.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Truck className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">{carrier.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Driver & Vehicle Selection (for internal) */}
          {formData.carrier === 'internal' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-4">Pilih Driver & Kendaraan dari Fleet</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DriverSelector
                  value={selectedDriver?.id || null}
                  onChange={(driver) => setSelectedDriver(driver)}
                  branch={requisition.fulfillingBranch?.id}
                />
                <VehicleSelector
                  value={selectedVehicle?.id || null}
                  onChange={(vehicle) => setSelectedVehicle(vehicle)}
                  branch={requisition.fulfillingBranch?.id}
                />
              </div>
              {selectedDriver && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Driver:</strong> {selectedDriver.fullName} ({selectedDriver.phone}) • 
                    {selectedDriver.licenseType} • 
                    {selectedDriver.totalDeliveries} deliveries
                  </p>
                </div>
              )}
              {selectedVehicle && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-900">
                    <strong>Kendaraan:</strong> {selectedVehicle.licensePlate} • 
                    {selectedVehicle.brand} {selectedVehicle.model} • 
                    Kapasitas: {selectedVehicle.maxWeightKg} kg
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Shipping Details */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Detail Pengiriman</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Estimasi Tanggal Pengiriman
                </label>
                <input
                  type="date"
                  value={formData.estimatedDeliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedDeliveryDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  Jumlah Paket
                </label>
                <input
                  type="number"
                  value={formData.totalPackages}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalPackages: parseInt(e.target.value) || 1 }))}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Berat Total (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.totalWeight}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalWeight: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volume Total (m³)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalVolume}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalVolume: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Cost Details */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Biaya</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Biaya Pengiriman (Rp)
                </label>
                <input
                  type="number"
                  value={formData.shippingCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, shippingCost: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Biaya Asuransi (Rp)
                </label>
                <input
                  type="number"
                  value={formData.insuranceCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, insuranceCost: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Instructions & Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Instruksi Pengiriman
            </label>
            <textarea
              value={formData.deliveryInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, deliveryInstructions: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Hubungi 30 menit sebelum tiba, kirim ke loading dock"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Catatan tambahan (opsional)"
            />
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
              {submitting ? 'Membuat...' : 'Buat Shipment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
