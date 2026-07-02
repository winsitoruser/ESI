import React, { useState, useEffect } from 'react';
import { X, Package, MapPin, Clock, CheckCircle, Truck, Calendar, Phone, User } from 'lucide-react';

interface TrackingUpdate {
  id: string;
  status: string;
  location: string;
  description: string;
  createdAt: string;
}

interface Shipment {
  id: string;
  shipmentNumber: string;
  trackingNumber: string | null;
  carrier: string;
  driverName: string | null;
  driverPhone: string | null;
  vehicleNumber: string | null;
  shippedFromBranch: {
    name: string;
  };
  shippedToBranch: {
    name: string;
  };
  status: string;
  estimatedDeliveryDate: string | null;
  totalPackages: number;
  totalWeight: number;
  notes: string | null;
}

interface ShipmentTrackingModalProps {
  shipmentId: string;
  onClose: () => void;
}

export default function ShipmentTrackingModal({ shipmentId, onClose }: ShipmentTrackingModalProps) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [trackingUpdates, setTrackingUpdates] = useState<TrackingUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrackingData();
  }, [shipmentId]);

  const fetchTrackingData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/tracking`);
      if (response.ok) {
        const data = await response.json();
        setShipment(data.data.shipment);
        setTrackingUpdates(data.data.trackingUpdates || []);
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'picked_up':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'in_transit':
        return <Truck className="w-5 h-5 text-orange-600" />;
      case 'out_for_delivery':
        return <MapPin className="w-5 h-5 text-purple-600" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      picked_up: 'Picked Up',
      in_transit: 'In Transit',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      failed: 'Failed',
      returned: 'Returned'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data tracking...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <p className="text-gray-600">Shipment tidak ditemukan</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Tracking: {shipment.shipmentNumber}</h2>
              {shipment.trackingNumber && (
                <p className="text-sm text-blue-100">Tracking Number: {shipment.trackingNumber}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Route Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">From</p>
                  <p className="font-medium">{shipment.shippedFromBranch.name}</p>
                </div>
              </div>
              <div className="flex-1 mx-4 border-t-2 border-dashed border-gray-300"></div>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-gray-600 text-right">To</p>
                  <p className="font-medium">{shipment.shippedToBranch.name}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Status & ETA */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <div className="flex items-center gap-2">
                {getStatusIcon(shipment.status)}
                <span className="font-medium">{getStatusLabel(shipment.status)}</span>
              </div>
            </div>
            {shipment.estimatedDeliveryDate && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">ETA</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="font-medium">
                    {new Date(shipment.estimatedDeliveryDate).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tracking Timeline */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Tracking History
            </h3>
            <div className="space-y-4">
              {trackingUpdates.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Belum ada update tracking</p>
              ) : (
                trackingUpdates.map((update, index) => (
                  <div key={update.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-full ${
                        index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                      }`}>
                        {getStatusIcon(update.status)}
                      </div>
                      {index < trackingUpdates.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-300 my-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{update.description}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {update.location}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(update.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Package Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Package Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Packages</p>
                <p className="font-medium">{shipment.totalPackages}</p>
              </div>
              <div>
                <p className="text-gray-600">Weight</p>
                <p className="font-medium">{shipment.totalWeight} kg</p>
              </div>
            </div>
          </div>

          {/* Carrier Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Carrier Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-600" />
                <span className="text-gray-600">Carrier:</span>
                <span className="font-medium">{shipment.carrier}</span>
              </div>
              {shipment.driverName && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600">Driver:</span>
                  <span className="font-medium">{shipment.driverName}</span>
                </div>
              )}
              {shipment.driverPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{shipment.driverPhone}</span>
                </div>
              )}
              {shipment.vehicleNumber && (
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium">{shipment.vehicleNumber}</span>
                </div>
              )}
            </div>
          </div>

          {shipment.notes && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-gray-700">{shipment.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
