import React, { useState } from 'react';
import { useRouter } from 'next/router';
import CustomersLayout from '@/components/customers/CustomersLayout';
import { useTranslation } from '@/lib/i18n';
import { FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaSave, FaTimes, FaBuilding, FaIdCard, FaBriefcase } from 'react-icons/fa';

const CustomerNewPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  
  const [customerType, setCustomerType] = useState<'individual' | 'corporate'>('individual');
  
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    address: '',
    notes: '',
    // Corporate fields
    companyName: '',
    picName: '',
    picPosition: '',
    contact1: '',
    contact2: '',
    companyEmail: '',
    companyAddress: '',
    taxId: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    
    // Validate form
    if (!formData.name || !formData.phoneNumber) {
      setFormError('Nama dan nomor telepon harus diisi');
      setIsSubmitting(false);
      return;
    }
    
    // Validate corporate fields
    if (customerType === 'corporate') {
      if (!formData.companyName) {
        setFormError('Nama perusahaan harus diisi untuk pelanggan corporate');
        setIsSubmitting(false);
        return;
      }
      if (!formData.picName) {
        setFormError('Nama PIC harus diisi untuk pelanggan corporate');
        setIsSubmitting(false);
        return;
      }
    }
    
    try {
      // Submit form data
      const response = await fetch('/api/customers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          customerType,
          membershipLevel: 'Bronze',
          type: 'member',
          registrationDate: new Date().toISOString(),
          isActive: true,
          totalSpent: 0
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menambahkan pelanggan baru');
      }
      
      setFormSuccess('Pelanggan baru berhasil ditambahkan');
      
      // Reset form
      setCustomerType('individual');
      setFormData({
        name: '',
        phoneNumber: '',
        email: '',
        address: '',
        notes: '',
        companyName: '',
        picName: '',
        picPosition: '',
        contact1: '',
        contact2: '',
        companyEmail: '',
        companyAddress: '',
        taxId: ''
      });
      
      // Redirect after successful creation
      setTimeout(() => {
        router.push('/customers/list');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating customer:', error);
      setFormError(error instanceof Error ? error.message : 'Terjadi kesalahan, silakan coba lagi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomersLayout title="Pelanggan Baru | FARMANESIA-EVO">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Tambah Pelanggan Baru</h1>
        
        {formError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {formError}
          </div>
        )}
        
        {formSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-600">
            {formSuccess}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Type Selection */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipe Pelanggan <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="customerType"
                  value="individual"
                  checked={customerType === 'individual'}
                  onChange={(e) => setCustomerType(e.target.value as 'individual' | 'corporate')}
                  className="mr-2 text-red-600 focus:ring-red-500"
                />
                <FaUser className="mr-2 text-gray-600" />
                <span className="text-gray-700">Individual</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="customerType"
                  value="corporate"
                  checked={customerType === 'corporate'}
                  onChange={(e) => setCustomerType(e.target.value as 'individual' | 'corporate')}
                  className="mr-2 text-red-600 focus:ring-red-500"
                />
                <FaBuilding className="mr-2 text-gray-600" />
                <span className="text-gray-700">Corporate</span>
              </label>
            </div>
          </div>

          {/* Corporate Fields */}
          {customerType === 'corporate' && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <FaBuilding className="mr-2 text-blue-600" />
                Informasi Perusahaan
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Perusahaan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaBuilding className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      required={customerType === 'corporate'}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="PT. Nama Perusahaan"
                    />
                  </div>
                </div>

                {/* Tax ID / NPWP */}
                <div>
                  <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">
                    NPWP / Tax ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaIdCard className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="taxId"
                      name="taxId"
                      value={formData.taxId}
                      onChange={handleChange}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="00.000.000.0-000.000"
                    />
                  </div>
                </div>

                {/* PIC Name */}
                <div>
                  <label htmlFor="picName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama PIC <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="picName"
                      name="picName"
                      value={formData.picName}
                      onChange={handleChange}
                      required={customerType === 'corporate'}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Nama Person In Charge"
                    />
                  </div>
                </div>

                {/* PIC Position */}
                <div>
                  <label htmlFor="picPosition" className="block text-sm font-medium text-gray-700 mb-1">
                    Jabatan PIC
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaBriefcase className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="picPosition"
                      name="picPosition"
                      value={formData.picPosition}
                      onChange={handleChange}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Contoh: Purchasing Manager"
                    />
                  </div>
                </div>

                {/* Contact 1 */}
                <div>
                  <label htmlFor="contact1" className="block text-sm font-medium text-gray-700 mb-1">
                    Kontak 1
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaPhone className="text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="contact1"
                      name="contact1"
                      value={formData.contact1}
                      onChange={handleChange}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="021-12345678"
                    />
                  </div>
                </div>

                {/* Contact 2 */}
                <div>
                  <label htmlFor="contact2" className="block text-sm font-medium text-gray-700 mb-1">
                    Kontak 2
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaPhone className="text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="contact2"
                      name="contact2"
                      value={formData.contact2}
                      onChange={handleChange}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="081234567890"
                    />
                  </div>
                </div>

                {/* Company Email */}
                <div>
                  <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Perusahaan
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaEnvelope className="text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="companyEmail"
                      name="companyEmail"
                      value={formData.companyEmail}
                      onChange={handleChange}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="info@company.com"
                    />
                  </div>
                </div>

                {/* Company Address */}
                <div className="md:col-span-2">
                  <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat Perusahaan
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <FaMapMarkerAlt className="text-gray-400" />
                    </div>
                    <textarea
                      id="companyAddress"
                      name="companyAddress"
                      value={formData.companyAddress}
                      onChange={handleChange}
                      rows={2}
                      className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Alamat lengkap perusahaan"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Pelanggan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
            </div>
            
            {/* Phone */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Nomor Telepon <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaPhone className="text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Contoh: 081234567890"
                />
              </div>
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Contoh: nama@email.com"
                />
              </div>
            </div>
            
            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Alamat
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaMapMarkerAlt className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Masukkan alamat lengkap"
                />
              </div>
            </div>
          </div>
          
          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Catatan Tambahan
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Informasi tambahan tentang pelanggan..."
            ></textarea>
          </div>
          
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <FaTimes className="text-gray-500" />
              <span>Batal</span>
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-md flex items-center space-x-2 hover:from-red-700 hover:to-orange-600 disabled:opacity-50"
            >
              <FaSave />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Pelanggan'}</span>
            </button>
          </div>
        </form>
      </div>
    </CustomersLayout>
  );
};

export default CustomerNewPage;
