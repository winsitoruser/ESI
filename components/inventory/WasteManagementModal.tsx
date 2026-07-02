import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import {
  FaTimes, FaTrash, FaExclamationTriangle, FaCheckCircle,
  FaCamera, FaDollarSign, FaClipboardList, FaRecycle
} from 'react-icons/fa';

interface WasteRecord {
  id: string;
  wasteNumber: string;
  productionBatchId?: string;
  wasteType: 'defective' | 'raw_material' | 'expired' | 'damaged';
  productSku?: string;
  productName?: string;
  quantity: number;
  unit: string;
  costValue: number;
  wasteDate: string;
  reason: string;
  disposalMethod: 'discard' | 'clearance_sale' | 'donation' | 'recycle';
  clearancePrice?: number;
  recordedBy: string;
  notes?: string;
  status: 'recorded' | 'disposed' | 'sold';
}

interface WasteManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionBatch?: any;
  onSubmit: (data: any) => void;
}

const WasteManagementModal: React.FC<WasteManagementModalProps> = ({
  isOpen,
  onClose,
  productionBatch,
  onSubmit
}) => {
  const { formatCurrency } = useTranslation();
  const [wasteType, setWasteType] = useState<string>('defective');
  const [quantity, setQuantity] = useState<number>(0);
  const [costValue, setCostValue] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [disposalMethod, setDisposalMethod] = useState<string>('discard');
  const [clearancePrice, setClearancePrice] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [qualityGrade, setQualityGrade] = useState<string>('C');
  const [disposalWitness, setDisposalWitness] = useState<string>('');
  const [disposalLocation, setDisposalLocation] = useState<string>('');


  const handleSubmit = () => {
    const wasteData = {
      wasteType,
      productionBatchId: productionBatch?.id,
      productSku: productionBatch?.productSku,
      productName: productionBatch?.recipeName,
      quantity,
      unit: productionBatch?.unit || 'unit',
      costValue,
      wasteDate: new Date().toISOString().split('T')[0],
      reason,
      disposalMethod,
      clearancePrice: disposalMethod === 'clearance_sale' ? clearancePrice : undefined,
      notes,
      recordedBy: 'Admin',
      // FMCG Compliance fields
      batchNumber: batchNumber || productionBatch?.batchNumber,
      expiryDate,
      qualityGrade,
      disposalWitness,
      disposalLocation,
      timestamp: new Date().toISOString(),
      complianceChecked: true
    };

    onSubmit(wasteData);
    handleClose();
  };

  const handleClose = () => {
    setWasteType('defective');
    setQuantity(0);
    setCostValue(0);
    setReason('');
    setDisposalMethod('discard');
    setClearancePrice(0);
    setNotes('');
    onClose();
  };

  const calculateLoss = () => {
    if (disposalMethod === 'clearance_sale') {
      return costValue - clearancePrice;
    }
    return costValue;
  };

  const getRecoveryRate = () => {
    if (costValue === 0) return 0;
    return ((clearancePrice / costValue) * 100).toFixed(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaTrash className="mr-3 text-red-600" />
                Manajemen Limbah & Produk Sisa
              </h2>
              <p className="text-sm text-gray-600 mt-1">Catat produk cacat, limbah, dan kerugian produksi</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Batch Info */}
          {productionBatch && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <h3 className="font-semibold text-blue-900 mb-2">Informasi Batch Produksi</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-600">Batch:</span>
                  <span className="ml-2 font-semibold">{productionBatch.batchNumber}</span>
                </div>
                <div>
                  <span className="text-blue-600">Produk:</span>
                  <span className="ml-2 font-semibold">{productionBatch.recipeName}</span>
                </div>
                <div>
                  <span className="text-blue-600">Jumlah Produksi:</span>
                  <span className="ml-2 font-semibold">{productionBatch.producedQuantity} {productionBatch.unit}</span>
                </div>
                <div>
                  <span className="text-blue-600">Total Biaya:</span>
                  <span className="ml-2 font-semibold">{formatCurrency(productionBatch.totalCost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Waste Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Tipe Limbah/Produk Sisa
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'defective', label: 'Produk Cacat', icon: FaExclamationTriangle, color: 'orange' },
                { value: 'raw_material', label: 'Bahan Baku Sisa', icon: FaRecycle, color: 'brown' },
                { value: 'expired', label: 'Kadaluarsa', icon: FaTrash, color: 'red' },
                { value: 'damaged', label: 'Rusak', icon: FaExclamationTriangle, color: 'yellow' }
              ].map((type) => {
                const Icon = type.icon;
                const isSelected = wasteType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setWasteType(type.value)}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      isSelected
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`text-2xl mx-auto mb-2 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} />
                    <p className={`text-xs font-medium text-center ${isSelected ? 'text-red-900' : 'text-gray-700'}`}>
                      {type.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity & Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Jumlah Limbah/Sisa
              </label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="text-lg"
                min={0}
              />
              <p className="text-xs text-gray-500 mt-1">
                Unit: {productionBatch?.unit || 'unit'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nilai Kerugian (Cost Value)
              </label>
              <Input
                type="number"
                value={costValue}
                onChange={(e) => setCostValue(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="text-lg"
                min={0}
              />
              <p className="text-xs text-gray-500 mt-1">
                Biaya produksi yang hilang
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Alasan/Penyebab
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Pilih alasan...</option>
              <option value="quality_issue">Masalah Kualitas</option>
              <option value="production_error">Kesalahan Produksi</option>
              <option value="equipment_failure">Kerusakan Alat</option>
              <option value="expired">Kadaluarsa</option>
              <option value="damaged_storage">Rusak saat Penyimpanan</option>
              <option value="damaged_handling">Rusak saat Handling</option>
              <option value="overproduction">Kelebihan Produksi</option>
              <option value="other">Lainnya</option>
            </select>
          </div>

          {/* Disposal Method */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Metode Penanganan
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'discard', label: 'Dibuang', icon: FaTrash },
                { value: 'clearance_sale', label: 'Jual Clearance', icon: FaDollarSign },
                { value: 'donation', label: 'Donasi', icon: FaCheckCircle },
                { value: 'recycle', label: 'Daur Ulang', icon: FaRecycle }
              ].map((method) => {
                const Icon = method.icon;
                const isSelected = disposalMethod === method.value;
                return (
                  <button
                    key={method.value}
                    onClick={() => setDisposalMethod(method.value)}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      isSelected
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <Icon className={`text-xl mx-auto mb-1 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} />
                    <p className={`text-xs font-medium text-center ${isSelected ? 'text-red-900' : 'text-gray-700'}`}>
                      {method.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clearance Price (if applicable) */}
          {disposalMethod === 'clearance_sale' && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
              <label className="block text-sm font-semibold text-green-900 mb-2">
                Harga Jual Clearance
              </label>
              <Input
                type="number"
                value={clearancePrice}
                onChange={(e) => setClearancePrice(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="text-lg mb-3"
                min={0}
              />
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-white p-2 rounded">
                  <p className="text-xs text-gray-600">Nilai Awal</p>
                  <p className="font-bold text-gray-900">{formatCurrency(costValue)}</p>
                </div>
                <div className="bg-white p-2 rounded">
                  <p className="text-xs text-gray-600">Recovery</p>
                  <p className="font-bold text-green-600">{formatCurrency(clearancePrice)}</p>
                </div>
                <div className="bg-white p-2 rounded">
                  <p className="text-xs text-gray-600">Net Loss</p>
                  <p className="font-bold text-red-600">{formatCurrency(calculateLoss())}</p>
                </div>
              </div>
              <p className="text-xs text-green-700 mt-2">
                Recovery Rate: {getRecoveryRate()}% dari nilai awal
              </p>
            </div>
          )}

          {/* FMCG Compliance Section */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
              <FaCheckCircle className="mr-2" />
              Compliance & Traceability (FMCG Standard)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1">
                  Batch/Lot Number
                </label>
                <Input
                  type="text"
                  value={batchNumber || productionBatch?.batchNumber || ''}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="BTH-2024-XXX"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1">
                  Expiry Date (if applicable)
                </label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1">
                  Quality Grade
                </label>
                <select
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A">Grade A - Premium (Normal Sale)</option>
                  <option value="B">Grade B - Second (Clearance Sale)</option>
                  <option value="C">Grade C - Reject (Disposal)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1">
                  Disposal Witness
                </label>
                <Input
                  type="text"
                  value={disposalWitness}
                  onChange={(e) => setDisposalWitness(e.target.value)}
                  placeholder="Nama saksi disposal"
                  className="text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-blue-700 mb-1">
                  Disposal Location/Method Detail
                </label>
                <Input
                  type="text"
                  value={disposalLocation}
                  onChange={(e) => setDisposalLocation(e.target.value)}
                  placeholder="Lokasi pembuangan atau detail metode"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="mt-3 p-2 bg-white rounded text-xs text-blue-700">
              <strong>Compliance Note:</strong> Dokumentasi ini diperlukan untuk audit trail, 
              traceability, dan memenuhi standard ISO 22000, HACCP, dan GMP.
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Catatan Tambahan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan detail tentang limbah/produk sisa..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
            />
          </div>

          {/* Summary */}
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-900 mb-3 flex items-center">
              <FaClipboardList className="mr-2" />
              Ringkasan Kerugian
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-red-600">Jumlah Limbah</p>
                <p className="text-lg font-bold text-red-900">{quantity} {productionBatch?.unit || 'unit'}</p>
              </div>
              <div>
                <p className="text-xs text-red-600">Nilai Kerugian</p>
                <p className="text-lg font-bold text-red-900">{formatCurrency(costValue)}</p>
              </div>
              {disposalMethod === 'clearance_sale' && (
                <>
                  <div>
                    <p className="text-xs text-green-600">Recovery</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(clearancePrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-red-600">Net Loss</p>
                    <p className="text-lg font-bold text-red-900">{formatCurrency(calculateLoss())}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!wasteType || quantity <= 0 || costValue <= 0 || !reason}
              className="bg-red-600 hover:bg-red-700"
            >
              <FaCheckCircle className="mr-2" />
              Catat Limbah & Kerugian
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WasteManagementModal;
