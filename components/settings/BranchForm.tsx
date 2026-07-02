import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaSave, FaTimes } from 'react-icons/fa';

interface BranchFormData {
  code: string;
  name: string;
  type: 'main' | 'branch' | 'warehouse' | 'kiosk';
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  managerId?: number;
  operatingHours: any[];
  isActive: boolean;
}

interface BranchFormProps {
  branch?: any;
  onSubmit: (data: BranchFormData) => Promise<void>;
  onCancel: () => void;
  managers?: any[];
}

const BranchForm: React.FC<BranchFormProps> = ({ 
  branch, 
  onSubmit, 
  onCancel,
  managers = []
}) => {
  const [formData, setFormData] = useState<BranchFormData>({
    code: '',
    name: '',
    type: 'branch',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    email: '',
    managerId: undefined,
    operatingHours: [
      { day: 'Senin', open: '09:00', close: '21:00', isOpen: true },
      { day: 'Selasa', open: '09:00', close: '21:00', isOpen: true },
      { day: 'Rabu', open: '09:00', close: '21:00', isOpen: true },
      { day: 'Kamis', open: '09:00', close: '21:00', isOpen: true },
      { day: 'Jumat', open: '09:00', close: '21:00', isOpen: true },
      { day: 'Sabtu', open: '09:00', close: '22:00', isOpen: true },
      { day: 'Minggu', open: '10:00', close: '20:00', isOpen: true }
    ],
    isActive: true
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branch) {
      setFormData({
        code: branch.code || '',
        name: branch.name || '',
        type: branch.type || 'branch',
        address: branch.address || '',
        city: branch.city || '',
        province: branch.province || '',
        postalCode: branch.postalCode || '',
        phone: branch.phone || '',
        email: branch.email || '',
        managerId: branch.managerId,
        operatingHours: branch.operatingHours || formData.operatingHours,
        isActive: branch.isActive !== undefined ? branch.isActive : true
      });
    }
  }, [branch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleOperatingHoursChange = (index: number, field: string, value: any) => {
    const updated = [...formData.operatingHours];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, operatingHours: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Cabang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kode Cabang *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                disabled={!!branch}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="BR-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Cabang *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Cabang Jakarta Selatan"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipe *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="main">Pusat</option>
                <option value="branch">Cabang</option>
                <option value="warehouse">Gudang</option>
                <option value="kiosk">Kiosk</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manager
              </label>
              <select
                name="managerId"
                value={formData.managerId || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Pilih Manager</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alamat
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Jl. Contoh No. 123"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kota
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Jakarta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provinsi
              </label>
              <input
                type="text"
                name="province"
                value={formData.province}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="DKI Jakarta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kode Pos
              </label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="12345"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telepon
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(021) 1234-5678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="cabang@toko.com"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">
              Cabang Aktif
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jam Operasional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.operatingHours.map((day, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-24">
                  <span className="font-medium text-gray-900">{day.day}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.isOpen}
                    onChange={(e) => handleOperatingHoursChange(index, 'isOpen', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Buka</span>
                </div>
                {day.isOpen && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={day.open}
                        onChange={(e) => handleOperatingHoursChange(index, 'open', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">-</span>
                      <input
                        type="time"
                        value={day.close}
                        onChange={(e) => handleOperatingHoursChange(index, 'close', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
                {!day.isOpen && (
                  <span className="text-sm text-gray-500 italic">Tutup</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          <FaTimes className="mr-2" />
          Batal
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Menyimpan...
            </>
          ) : (
            <>
              <FaSave className="mr-2" />
              Simpan Cabang
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default BranchForm;
