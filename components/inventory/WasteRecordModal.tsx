import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FaTimes, FaSave, FaTrash } from 'react-icons/fa';

interface WasteRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  productions?: Array<{
    id: number;
    batch_number: string;
    recipe?: { name: string };
  }>;
}

const WasteRecordModal: React.FC<WasteRecordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productions = []
}) => {
  const [formData, setFormData] = useState({
    production_id: '',
    waste_type: 'finished_product',
    waste_category: 'defect',
    quantity: 0,
    unit: 'pcs',
    cost_value: 0,
    disposal_method: 'discard',
    clearance_price: 0,
    reason: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'cost_value' || name === 'clearance_price'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      production_id: '',
      waste_type: 'finished_product',
      waste_category: 'defect',
      quantity: 0,
      unit: 'pcs',
      cost_value: 0,
      disposal_method: 'discard',
      clearance_price: 0,
      reason: '',
      notes: ''
    });
  };

  if (!isOpen) return null;

  const netLoss = formData.disposal_method === 'clearance_sale'
    ? formData.cost_value - formData.clearance_price
    : formData.cost_value;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaTrash className="text-2xl" />
              <div>
                <h2 className="text-2xl font-bold">Catat Limbah Produksi</h2>
                <p className="text-red-100 text-sm">Pencatatan produk cacat, kadaluarsa, atau rusak</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Production Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Batch Produksi (Opsional)
            </label>
            <select
              name="production_id"
              value={formData.production_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">Tidak terkait batch tertentu</option>
              {productions.map(prod => (
                <option key={prod.id} value={prod.id}>
                  {prod.batch_number} - {prod.recipe?.name}
                </option>
              ))}
            </select>
          </div>

          {/* Waste Type & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipe Limbah *
              </label>
              <select
                name="waste_type"
                value={formData.waste_type}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="raw_material">Bahan Baku</option>
                <option value="work_in_progress">WIP</option>
                <option value="finished_product">Produk Jadi</option>
                <option value="packaging">Kemasan</option>
                <option value="other">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Kategori *
              </label>
              <select
                name="waste_category"
                value={formData.waste_category}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="defect">Cacat/Defect</option>
                <option value="expired">Kadaluarsa</option>
                <option value="damaged">Rusak</option>
                <option value="overproduction">Overproduksi</option>
                <option value="spillage">Tumpah/Tercecer</option>
                <option value="contamination">Kontaminasi</option>
              </select>
            </div>
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Jumlah *
              </label>
              <Input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Satuan *
              </label>
              <Input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                required
                placeholder="pcs, kg, liter, dll"
                className="w-full"
              />
            </div>
          </div>

          {/* Cost Value */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nilai Kerugian (Rp) *
            </label>
            <Input
              type="number"
              name="cost_value"
              value={formData.cost_value}
              onChange={handleChange}
              step="1000"
              min="0"
              required
              className="w-full"
            />
          </div>

          {/* Disposal Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Metode Penanganan *
            </label>
            <select
              name="disposal_method"
              value={formData.disposal_method}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="discard">Buang</option>
              <option value="recycle">Daur Ulang</option>
              <option value="rework">Rework/Perbaiki</option>
              <option value="clearance_sale">Clearance Sale</option>
              <option value="donation">Donasi</option>
            </select>
          </div>

          {/* Clearance Price (if clearance_sale) */}
          {formData.disposal_method === 'clearance_sale' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Harga Clearance (Rp)
              </label>
              <Input
                type="number"
                name="clearance_price"
                value={formData.clearance_price}
                onChange={handleChange}
                step="1000"
                min="0"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recovery dari penjualan clearance
              </p>
            </div>
          )}

          {/* Net Loss Display */}
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Kerugian Bersih:</span>
              <span className="text-2xl font-bold text-red-600">
                Rp {netLoss.toLocaleString('id-ID')}
              </span>
            </div>
            {formData.disposal_method === 'clearance_sale' && formData.clearance_price > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                Recovery: Rp {formData.clearance_price.toLocaleString('id-ID')} dari Rp {formData.cost_value.toLocaleString('id-ID')}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Alasan
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="Jelaskan penyebab limbah..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Catatan Tambahan
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="Catatan tambahan..."
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              <FaTimes className="mr-2" />
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <FaSave className="mr-2" />
              Simpan Limbah
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WasteRecordModal;
