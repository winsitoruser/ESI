import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { FaTimes, FaSpinner } from 'react-icons/fa';

interface StartShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StartShiftModal({ isOpen, onClose, onSuccess }: StartShiftModalProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    shiftName: 'Pagi',
    startTime: '08:00',
    endTime: '16:00',
    initialCashAmount: 1000000,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shiftTimes = {
    Pagi: { start: '08:00', end: '16:00' },
    Siang: { start: '16:00', end: '00:00' },
    Malam: { start: '00:00', end: '08:00' }
  };

  const handleShiftChange = (shiftName: string) => {
    const times = shiftTimes[shiftName as keyof typeof shiftTimes];
    setFormData({
      ...formData,
      shiftName,
      startTime: times.start,
      endTime: times.end
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/pos/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          employeeId: session?.user?.id
        })
      });

      const data = await response.json();

      if (response.ok && data.shift) {
        alert('Shift berhasil dibuka!');
        onSuccess();
        onClose();
        resetForm();
      } else {
        setError(data.error || 'Gagal membuka shift');
      }
    } catch (error) {
      console.error('Error starting shift:', error);
      setError('Terjadi kesalahan saat membuka shift');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      shiftName: 'Pagi',
      startTime: '08:00',
      endTime: '16:00',
      initialCashAmount: 1000000,
      notes: ''
    });
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Mulai Shift Baru</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaTimes className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shift Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Shift *
            </label>
            <select
              value={formData.shiftName}
              onChange={(e) => handleShiftChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="Pagi">Pagi (08:00 - 16:00)</option>
              <option value="Siang">Siang (16:00 - 00:00)</option>
              <option value="Malam">Malam (00:00 - 08:00)</option>
            </select>
          </div>

          {/* Time Display */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jam Mulai
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jam Selesai
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Initial Cash */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modal Awal (Rp) *
            </label>
            <input
              type="number"
              value={formData.initialCashAmount}
              onChange={(e) => setFormData({...formData, initialCashAmount: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="1000000"
              min="0"
              step="1000"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Rp {formData.initialCashAmount.toLocaleString('id-ID')}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan (Opsional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder="Catatan pembukaan shift..."
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Info:</strong> Pastikan modal awal sudah dihitung dengan benar sebelum membuka shift.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Mulai Shift</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
