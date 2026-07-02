import React from 'react';
import { FaClock, FaUser, FaMoneyBillWave } from 'react-icons/fa';

interface ShiftLogEntry {
  id: string;
  cashierName: string;
  openedAt: Date;
  closedAt?: Date;
  openingCash: number;
  closingCash?: number;
  totalSales: number;
  transactionCount: number;
  status: 'open' | 'closed';
}

interface ShiftLogProps {
  shifts: ShiftLogEntry[];
}

const ShiftLog: React.FC<ShiftLogProps> = ({ shifts }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-3">
      {shifts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FaClock className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Belum ada log shift</p>
        </div>
      ) : (
        shifts.map((shift) => (
          <div
            key={shift.id}
            className={`p-4 rounded-lg border-2 ${
              shift.status === 'open'
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FaUser className="text-gray-600" />
                <span className="font-semibold">{shift.cashierName}</span>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  shift.status === 'open'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {shift.status === 'open' ? 'Aktif' : 'Selesai'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-600">Buka:</p>
                <p className="font-medium">{formatTime(shift.openedAt)}</p>
              </div>
              {shift.closedAt && (
                <div>
                  <p className="text-gray-600">Tutup:</p>
                  <p className="font-medium">{formatTime(shift.closedAt)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-600">Saldo Awal:</p>
                <p className="font-medium">{formatCurrency(shift.openingCash)}</p>
              </div>
              {shift.closingCash !== undefined && (
                <div>
                  <p className="text-gray-600">Saldo Akhir:</p>
                  <p className="font-medium">{formatCurrency(shift.closingCash)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-600">Transaksi:</p>
                <p className="font-medium">{shift.transactionCount}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Penjualan:</p>
                <p className="font-medium text-green-600">
                  {formatCurrency(shift.totalSales)}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ShiftLog;
