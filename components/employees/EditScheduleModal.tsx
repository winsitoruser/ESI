import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUser, FaTrash } from 'react-icons/fa';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule: any;
  employees: any[];
  locations?: any[];
}

const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schedule,
  employees,
  locations = []
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    scheduleDate: '',
    shiftType: 'pagi',
    startTime: '08:00',
    endTime: '16:00',
    locationId: '',
    status: 'scheduled',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && schedule) {
      setFormData({
        scheduleDate: schedule.scheduleDate,
        shiftType: schedule.shiftType,
        startTime: schedule.startTime.substring(0, 5),
        endTime: schedule.endTime.substring(0, 5),
        locationId: schedule.location?.id || '',
        status: schedule.status,
        notes: schedule.notes || ''
      });
    }
  }, [isOpen, schedule]);

  const handleShiftTypeChange = (type: string) => {
    let startTime = '08:00';
    let endTime = '16:00';

    switch (type) {
      case 'pagi':
        startTime = '08:00';
        endTime = '16:00';
        break;
      case 'siang':
        startTime = '14:00';
        endTime = '22:00';
        break;
      case 'malam':
        startTime = '22:00';
        endTime = '06:00';
        break;
      case 'full':
        startTime = '08:00';
        endTime = '20:00';
        break;
    }

    setFormData({
      ...formData,
      shiftType: type,
      startTime,
      endTime
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/employees/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Gagal mengupdate jadwal');
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Terjadi kesalahan saat mengupdate jadwal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/employees/schedules/${schedule.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Gagal menghapus jadwal');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Terjadi kesalahan saat menghapus jadwal');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !schedule) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FaCalendarAlt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Jadwal</h2>
              <p className="text-sm text-gray-600">{schedule.employee?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Info (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FaUser className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{schedule.employee?.name}</p>
                <p className="text-sm text-gray-600">
                  {schedule.employee?.position} - {schedule.employee?.employeeNumber}
                </p>
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendarAlt className="inline mr-2" />
              Tanggal *
            </label>
            <input
              type="date"
              value={formData.scheduleDate}
              onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Shift Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipe Shift *
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: 'pagi', label: 'Pagi', color: 'yellow' },
                { value: 'siang', label: 'Siang', color: 'blue' },
                { value: 'malam', label: 'Malam', color: 'purple' },
                { value: 'full', label: 'Full Day', color: 'green' }
              ].map((shift) => (
                <button
                  key={shift.value}
                  type="button"
                  onClick={() => handleShiftTypeChange(shift.value)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    formData.shiftType === shift.value
                      ? `border-${shift.color}-500 bg-${shift.color}-50 text-${shift.color}-700 font-semibold`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {shift.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaClock className="inline mr-2" />
                Waktu Mulai *
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaClock className="inline mr-2" />
                Waktu Selesai *
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="scheduled">Terjadwal</option>
              <option value="confirmed">Terkonfirmasi</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
              <option value="absent">Tidak Hadir</option>
            </select>
          </div>

          {/* Location (Optional) */}
          {locations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaMapMarkerAlt className="inline mr-2" />
                Lokasi (Opsional)
              </label>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Pilih Lokasi</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan (Opsional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tambahkan catatan jika diperlukan..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleDelete}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              disabled={loading}
            >
              <FaTrash />
              <span>Hapus</span>
            </button>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading && <FaSpinner className="animate-spin" />}
                <span>{loading ? 'Menyimpan...' : 'Update Jadwal'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditScheduleModal;
