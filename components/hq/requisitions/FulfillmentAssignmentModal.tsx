import React, { useState, useEffect } from 'react';
import { X, Building2, Package, Calendar, MapPin, Loader } from 'lucide-react';

interface Branch {
  id: string;
  code: string;
  name: string;
  type: string;
  city: string;
  availableStock: number;
  distance: number;
  estimatedDeliveryDays: number;
}

interface FulfillmentAssignmentModalProps {
  requisition: any;
  onClose: () => void;
  onAssign: (branchId: string, deliveryDate: string, notes: string) => Promise<void>;
}

export default function FulfillmentAssignmentModal({
  requisition,
  onClose,
  onAssign
}: FulfillmentAssignmentModalProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAvailableBranches();
  }, []);

  const fetchAvailableBranches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hq/requisitions/available-branches?requisitionId=${requisition.id}`);
      if (response.ok) {
        const data = await response.json();
        setBranches(data.data || []);
      } else {
        console.error('Failed to fetch branches');
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBranchId) {
      alert('Pilih cabang pemenuhan terlebih dahulu');
      return;
    }

    setSubmitting(true);
    try {
      await onAssign(selectedBranchId, deliveryDate, notes);
      onClose();
    } catch (error) {
      console.error('Error assigning fulfillment:', error);
      alert('Gagal menetapkan pemenuhan');
    } finally {
      setSubmitting(false);
    }
  };

  const getBranchTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      warehouse: 'Gudang',
      main: 'Pusat',
      branch: 'Cabang',
      kiosk: 'Kiosk'
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tentukan Cabang Pemenuhan</h2>
              <p className="text-sm text-gray-500">Pilih cabang/gudang yang akan memenuhi permintaan</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Requisition Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nomor IR</p>
                <p className="font-medium">{requisition.irNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cabang Peminta</p>
                <p className="font-medium">{requisition.requestingBranch?.name}</p>
              </div>
            </div>
          </div>

          {/* Branch Selection */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Pilih Cabang/Gudang Pemenuhan</h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <Loader className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-600" />
                Memuat cabang tersedia...
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                Tidak ada cabang tersedia
              </div>
            ) : (
              <div className="space-y-3">
                {branches.map(branch => (
                  <div
                    key={branch.id}
                    onClick={() => setSelectedBranchId(branch.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedBranchId === branch.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedBranchId === branch.id ? 'border-blue-500' : 'border-gray-300'
                        }`}>
                          {selectedBranchId === branch.id && (
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{branch.name}</div>
                          <div className="text-sm text-gray-500">{branch.code} • {branch.city}</div>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-gray-600">
                              <Package className="w-4 h-4" />
                              Stok: {branch.availableStock > 0 ? branch.availableStock : 'N/A'}
                            </span>
                            {branch.distance > 0 && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <MapPin className="w-4 h-4" />
                                {branch.distance} km
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {getBranchTypeLabel(branch.type)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimasi Tanggal Pengiriman (opsional)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan (opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Tambahkan catatan jika diperlukan..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedBranchId || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting && <Loader className="w-4 h-4 animate-spin" />}
              {submitting ? 'Menyimpan...' : 'Simpan Pemenuhan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
