import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaCalendarAlt, FaClock, FaUser, FaMapMarkerAlt, FaMoneyBillWave, FaHistory, FaChartLine, FaExchangeAlt } from 'react-icons/fa';
import { Badge } from '@/components/ui/badge';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  schedules: any[];
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({
  isOpen,
  onClose,
  date,
  schedules
}) => {
  const [loading, setLoading] = useState(false);
  const [shiftDetails, setShiftDetails] = useState<any[]>([]);
  const [cashHistory, setCashHistory] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && date) {
      fetchDayDetails();
    }
  }, [isOpen, date]);

  const fetchDayDetails = async () => {
    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // Fetch shift details for the day
      const shiftResponse = await fetch(`/api/pos/shifts?date=${dateStr}`);
      if (shiftResponse.ok) {
        const shiftData = await shiftResponse.json();
        if (shiftData.success) {
          setShiftDetails(shiftData.data || []);
        }
      }

      // Fetch cash history for the day
      const cashResponse = await fetch(`/api/pos/cash-history?date=${dateStr}`);
      if (cashResponse.ok) {
        const cashData = await cashResponse.json();
        if (cashData.success) {
          setCashHistory(cashData.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching day details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      scheduled: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
      absent: 'bg-orange-100 text-orange-700',
      active: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getShiftColor = (shiftType: string) => {
    const colors: any = {
      pagi: 'bg-yellow-500',
      siang: 'bg-blue-500',
      malam: 'bg-purple-500',
      full: 'bg-green-500'
    };
    return colors[shiftType] || 'bg-gray-500';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaCalendarAlt className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Detail Hari
                </h2>
                <p className="text-sm text-gray-600">
                  {date.toLocaleDateString('id-ID', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Jadwal</p>
                    <p className="text-3xl font-bold text-blue-700">{schedules.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                    <FaUser className="w-6 h-6 text-blue-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Shift Aktif</p>
                    <p className="text-3xl font-bold text-green-700">
                      {shiftDetails.filter(s => s.status === 'active').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                    <FaClock className="w-6 h-6 text-green-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Total Transaksi</p>
                    <p className="text-3xl font-bold text-purple-700">
                      {shiftDetails.reduce((sum, s) => sum + (s.transactionCount || 0), 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                    <FaChartLine className="w-6 h-6 text-purple-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Schedules */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="border-b border-gray-200 p-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <FaUser className="mr-2 text-blue-600" />
                  Jadwal Karyawan
                </h3>
              </div>
              <div className="p-4">
                {schedules.length === 0 ? (
                  <div className="text-center py-8">
                    <FaCalendarAlt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">Tidak ada jadwal untuk hari ini</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-1 h-16 rounded-full ${getShiftColor(schedule.shiftType)}`}></div>
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-lg font-bold text-blue-600">
                              {schedule.employee?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{schedule.employee?.name}</p>
                            <p className="text-sm text-gray-600">{schedule.employee?.position}</p>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-xs text-gray-500 flex items-center">
                                <FaClock className="mr-1" />
                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                              </span>
                              {schedule.location && (
                                <span className="text-xs text-gray-500 flex items-center">
                                  <FaMapMarkerAlt className="mr-1" />
                                  {schedule.location.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(schedule.status)}>
                            {schedule.status}
                          </Badge>
                          <span className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                            {schedule.shiftType.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Shift Details */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="border-b border-gray-200 p-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <FaClock className="mr-2 text-green-600" />
                  Detail Shift POS
                </h3>
              </div>
              <div className="p-4">
                {shiftDetails.length === 0 ? (
                  <div className="text-center py-8">
                    <FaClock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">Tidak ada data shift untuk hari ini</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shiftDetails.map((shift) => (
                      <div
                        key={shift.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <FaClock className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                Shift #{shift.shiftNumber || shift.id.substring(0, 8)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {shift.cashier?.name || 'Kasir'}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(shift.status)}>
                            {shift.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Waktu Mulai</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {shift.startTime ? new Date(shift.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Waktu Selesai</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {shift.endTime ? new Date(shift.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Modal Awal</p>
                            <p className="text-sm font-semibold text-green-600">
                              {formatCurrency(shift.openingCash || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total Penjualan</p>
                            <p className="text-sm font-semibold text-blue-600">
                              {formatCurrency(shift.totalSales || 0)}
                            </p>
                          </div>
                        </div>

                        {shift.status === 'closed' && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Cash Akhir</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(shift.closingCash || 0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Total Transaksi</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {shift.transactionCount || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Selisih</p>
                                <p className={`text-sm font-semibold ${
                                  (shift.cashDifference || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(shift.cashDifference || 0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Status Cash</p>
                                <Badge className={
                                  (shift.cashDifference || 0) === 0 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-orange-100 text-orange-700'
                                }>
                                  {(shift.cashDifference || 0) === 0 ? 'Balance' : 'Difference'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cash History */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="border-b border-gray-200 p-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <FaMoneyBillWave className="mr-2 text-yellow-600" />
                  Riwayat Cash
                </h3>
              </div>
              <div className="p-4">
                {cashHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <FaHistory className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">Tidak ada riwayat cash untuk hari ini</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cashHistory.map((cash, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            cash.type === 'in' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            <FaExchangeAlt className={`w-5 h-5 ${
                              cash.type === 'in' ? 'text-green-600' : 'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{cash.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(cash.timestamp).toLocaleTimeString('id-ID')} - {cash.user?.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            cash.type === 'in' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {cash.type === 'in' ? '+' : '-'}{formatCurrency(cash.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Saldo: {formatCurrency(cash.balance)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayDetailModal;
