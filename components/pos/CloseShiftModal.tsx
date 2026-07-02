import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shift: any;
}

export default function CloseShiftModal({ isOpen, onClose, onSuccess, shift }: CloseShiftModalProps) {
  const [formData, setFormData] = useState({
    finalCashAmount: 0,
    notes: ''
  });
  const [cashBreakdown, setCashBreakdown] = useState({
    cash100k: 0,
    cash50k: 0,
    cash20k: 0,
    cash10k: 0,
    cash5k: 0,
    cash2k: 0,
    cash1k: 0,
    coins: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateTotal = () => {
    return (
      cashBreakdown.cash100k * 100000 +
      cashBreakdown.cash50k * 50000 +
      cashBreakdown.cash20k * 20000 +
      cashBreakdown.cash10k * 10000 +
      cashBreakdown.cash5k * 5000 +
      cashBreakdown.cash2k * 2000 +
      cashBreakdown.cash1k * 1000 +
      cashBreakdown.coins
    );
  };

  useEffect(() => {
    setFormData({...formData, finalCashAmount: calculateTotal()});
  }, [cashBreakdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/pos/shifts/${shift.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalCashAmount: formData.finalCashAmount,
          notes: formData.notes,
          cashBreakdown
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Shift berhasil ditutup!');
        onSuccess();
        onClose();
        resetForm();
      } else {
        setError(data.error || 'Gagal menutup shift');
      }
    } catch (error) {
      console.error('Error closing shift:', error);
      setError('Terjadi kesalahan saat menutup shift');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      finalCashAmount: 0,
      notes: ''
    });
    setCashBreakdown({
      cash100k: 0,
      cash50k: 0,
      cash20k: 0,
      cash10k: 0,
      cash5k: 0,
      cash2k: 0,
      cash1k: 0,
      coins: 0
    });
    setError('');
  };

  if (!isOpen || !shift) return null;

  const expectedCash = (shift.initialCashAmount || 0) + (shift.totalSales || 0);
  const cashDifference = formData.finalCashAmount - expectedCash;
  const hasDifference = Math.abs(cashDifference) > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Tutup Shift</h3>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shift Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Shift</p>
                <p className="text-sm font-semibold text-gray-900">{shift.shiftName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Kasir</p>
                <p className="text-sm font-semibold text-gray-900">{shift.opener?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Modal Awal</p>
                <p className="text-sm font-semibold text-gray-900">
                  Rp {(shift.initialCashAmount || 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Penjualan</p>
                <p className="text-sm font-semibold text-green-600">
                  Rp {(shift.totalSales || 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Expected Cash</p>
                <p className="text-sm font-semibold text-blue-600">
                  Rp {expectedCash.toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Transaksi</p>
                <p className="text-sm font-semibold text-gray-900">
                  {shift.totalTransactions || 0} transaksi
                </p>
              </div>
            </div>
          </div>

          {/* Cash Counting */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Hitung Uang Kas</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Rp 100.000</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={cashBreakdown.cash100k}
                    onChange={(e) => setCashBreakdown({...cashBreakdown, cash100k: Number(e.target.value)})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    min="0"
                  />
                  <span className="text-xs text-gray-500 w-24">
                    = Rp {(cashBreakdown.cash100k * 100000).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Rp 50.000</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={cashBreakdown.cash50k}
                    onChange={(e) => setCashBreakdown({...cashBreakdown, cash50k: Number(e.target.value)})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    min="0"
                  />
                  <span className="text-xs text-gray-500 w-24">
                    = Rp {(cashBreakdown.cash50k * 50000).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Rp 20.000</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={cashBreakdown.cash20k}
                    onChange={(e) => setCashBreakdown({...cashBreakdown, cash20k: Number(e.target.value)})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    min="0"
                  />
                  <span className="text-xs text-gray-500 w-24">
                    = Rp {(cashBreakdown.cash20k * 20000).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Rp 10.000</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={cashBreakdown.cash10k}
                    onChange={(e) => setCashBreakdown({...cashBreakdown, cash10k: Number(e.target.value)})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    min="0"
                  />
                  <span className="text-xs text-gray-500 w-24">
                    = Rp {(cashBreakdown.cash10k * 10000).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Rp 5.000</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={cashBreakdown.cash5k}
                    onChange={(e) => setCashBreakdown({...cashBreakdown, cash5k: Number(e.target.value)})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    min="0"
                  />
                  <span className="text-xs text-gray-500 w-24">
                    = Rp {(cashBreakdown.cash5k * 5000).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Rp 2.000</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={cashBreakdown.cash2k}
                    onChange={(e) => setCashBreakdown({...cashBreakdown, cash2k: Number(e.target.value)})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    min="0"
                  />
                  <span className="text-xs text-gray-500 w-24">
                    = Rp {(cashBreakdown.cash2k * 2000).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Rp 1.000</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={cashBreakdown.cash1k}
                    onChange={(e) => setCashBreakdown({...cashBreakdown, cash1k: Number(e.target.value)})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    min="0"
                  />
                  <span className="text-xs text-gray-500 w-24">
                    = Rp {(cashBreakdown.cash1k * 1000).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Koin</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={cashBreakdown.coins}
                    onChange={(e) => setCashBreakdown({...cashBreakdown, coins: Number(e.target.value)})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    min="0"
                  />
                  <span className="text-xs text-gray-500 w-24">
                    = Rp {cashBreakdown.coins.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Total & Difference */}
          <div className={`border-2 rounded-lg p-4 ${hasDifference ? (cashDifference > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300') : 'bg-green-50 border-green-300'}`}>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Total Kas Aktual:</span>
                <span className="font-bold text-2xl text-gray-900">
                  Rp {calculateTotal().toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Expected Cash:</span>
                <span className="font-bold text-lg text-blue-600">
                  Rp {expectedCash.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-semibold text-gray-700">Selisih:</span>
                <span className={`font-bold text-xl ${cashDifference > 0 ? 'text-yellow-600' : cashDifference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {cashDifference >= 0 ? '+' : ''}Rp {cashDifference.toLocaleString('id-ID')}
                  {cashDifference > 0 && ' (Lebih)'}
                  {cashDifference < 0 && ' (Kurang)'}
                  {cashDifference === 0 && ' (Pas)'}
                </span>
              </div>
            </div>

            {hasDifference && (
              <div className="mt-3 flex items-start gap-2 p-2 bg-white rounded border border-yellow-200">
                <FaExclamationTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <p className="text-xs text-yellow-800">
                  <strong>Perhatian:</strong> Ada selisih kas. Pastikan untuk mencatat alasan selisih di catatan.
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Penutupan {hasDifference && <span className="text-red-600">*</span>}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={3}
              placeholder={hasDifference ? "Jelaskan alasan selisih kas..." : "Catatan penutupan shift..."}
              required={hasDifference}
            />
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
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Tutup Shift</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
