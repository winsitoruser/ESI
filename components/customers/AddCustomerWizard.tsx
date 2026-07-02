import React, { useState } from 'react';
import { FaUser, FaBuilding, FaPhone, FaEnvelope, FaMapMarkerAlt, FaCheck, FaArrowLeft, FaArrowRight, FaIdCard, FaBriefcase } from 'react-icons/fa';

interface AddCustomerWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddCustomerWizard: React.FC<AddCustomerWizardProps> = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [customerType, setCustomerType] = useState<'individual' | 'corporate'>('individual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    phone: '',
    email: '',
    address: '',
    // Corporate Info
    companyName: '',
    picName: '',
    picPosition: '',
    contact1: '',
    contact2: '',
    companyEmail: '',
    companyAddress: '',
    taxId: '',
    // Membership
    type: 'member',
    membershipLevel: 'Bronze'
  });

  const totalSteps = customerType === 'corporate' ? 4 : 3;

  const steps = customerType === 'corporate' 
    ? [
        { number: 1, title: 'Tipe Pelanggan', icon: FaUser },
        { number: 2, title: 'Info Perusahaan', icon: FaBuilding },
        { number: 3, title: 'Info Kontak', icon: FaPhone },
        { number: 4, title: 'Review', icon: FaCheck }
      ]
    : [
        { number: 1, title: 'Tipe Pelanggan', icon: FaUser },
        { number: 2, title: 'Info Pelanggan', icon: FaPhone },
        { number: 3, title: 'Review', icon: FaCheck }
      ];

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (customerType === 'corporate') {
        if (!formData.companyName || !formData.picName) {
          setError('Nama perusahaan dan nama PIC harus diisi');
          return;
        }
      } else {
        if (!formData.name || !formData.phone) {
          setError('Nama dan telepon harus diisi');
          return;
        }
      }
      setError(null);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (customerType === 'corporate') {
        if (!formData.name || !formData.phone) {
          setError('Nama kontak dan telepon harus diisi');
          return;
        }
        setError(null);
        setCurrentStep(4);
      } else {
        // For individual, step 3 is review
        setError(null);
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/customers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customerType
        })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        handleClose();
      } else {
        setError(data.error || 'Gagal menambahkan pelanggan');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat menambahkan pelanggan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setCustomerType('individual');
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      companyName: '',
      picName: '',
      picPosition: '',
      contact1: '',
      contact2: '',
      companyEmail: '',
      companyAddress: '',
      taxId: '',
      type: 'member',
      membershipLevel: 'Bronze'
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Tambah Pelanggan Baru</h2>
          <p className="text-sm text-gray-500 mt-1">Langkah {currentStep} dari {totalSteps}</p>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep >= step.number 
                      ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white' 
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 text-center ${
                    currentStep >= step.number ? 'text-red-600 font-medium' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    currentStep > step.number ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Customer Type Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pilih Tipe Pelanggan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setCustomerType('individual')}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      customerType === 'individual'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FaUser className={`w-12 h-12 mx-auto mb-3 ${
                      customerType === 'individual' ? 'text-red-600' : 'text-gray-400'
                    }`} />
                    <h4 className="font-semibold text-gray-900 mb-1">Individual</h4>
                    <p className="text-sm text-gray-500">Pelanggan perorangan</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomerType('corporate')}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      customerType === 'corporate'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FaBuilding className={`w-12 h-12 mx-auto mb-3 ${
                      customerType === 'corporate' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <h4 className="font-semibold text-gray-900 mb-1">Corporate</h4>
                    <p className="text-sm text-gray-500">Pelanggan perusahaan</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Corporate Info (only for corporate) */}
          {currentStep === 2 && customerType === 'corporate' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Perusahaan</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Perusahaan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaBuilding className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="PT. Nama Perusahaan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama PIC <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.picName}
                      onChange={(e) => setFormData({...formData, picName: e.target.value})}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Nama Person In Charge"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jabatan PIC
                  </label>
                  <div className="relative">
                    <FaBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.picPosition}
                      onChange={(e) => setFormData({...formData, picPosition: e.target.value})}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Contoh: Manager"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NPWP / Tax ID
                  </label>
                  <div className="relative">
                    <FaIdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="00.000.000.0-000.000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kontak 1
                  </label>
                  <div className="relative">
                    <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.contact1}
                      onChange={(e) => setFormData({...formData, contact1: e.target.value})}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="021-12345678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kontak 2
                  </label>
                  <div className="relative">
                    <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.contact2}
                      onChange={(e) => setFormData({...formData, contact2: e.target.value})}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="081234567890"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Perusahaan
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={formData.companyEmail}
                      onChange={(e) => setFormData({...formData, companyEmail: e.target.value})}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="info@company.com"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat Perusahaan
                  </label>
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" />
                    <textarea
                      value={formData.companyAddress}
                      onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
                      rows={2}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Alamat lengkap perusahaan"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2/3: Individual Info or Corporate Contact Info */}
          {((currentStep === 2 && customerType === 'individual') || (currentStep === 3 && customerType === 'corporate')) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {customerType === 'corporate' ? 'Informasi Kontak' : 'Informasi Pelanggan'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama {customerType === 'corporate' ? 'Kontak' : 'Pelanggan'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Nama lengkap"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor Telepon <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="081234567890"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat
                  </label>
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" />
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      rows={2}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Alamat lengkap"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipe Customer
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="walk-in">Walk-in</option>
                    <option value="member">Member</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Membership Level
                  </label>
                  <select
                    value={formData.membershipLevel}
                    onChange={(e) => setFormData({...formData, membershipLevel: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3/4: Review */}
          {((currentStep === 3 && customerType === 'individual') || (currentStep === 4 && customerType === 'corporate')) && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Data Pelanggan</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-500">Tipe Pelanggan</span>
                  <span className="text-sm font-semibold text-gray-900 flex items-center">
                    {customerType === 'corporate' ? (
                      <><FaBuilding className="mr-2 text-blue-600" /> Corporate</>
                    ) : (
                      <><FaUser className="mr-2 text-green-600" /> Individual</>
                    )}
                  </span>
                </div>

                {customerType === 'corporate' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Nama Perusahaan</span>
                      <span className="text-sm font-medium text-gray-900">{formData.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Nama PIC</span>
                      <span className="text-sm font-medium text-gray-900">{formData.picName}</span>
                    </div>
                    {formData.picPosition && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Jabatan PIC</span>
                        <span className="text-sm font-medium text-gray-900">{formData.picPosition}</span>
                      </div>
                    )}
                    {formData.taxId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">NPWP</span>
                        <span className="text-sm font-medium text-gray-900">{formData.taxId}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Nama {customerType === 'corporate' ? 'Kontak' : 'Pelanggan'}</span>
                  <span className="text-sm font-medium text-gray-900">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Telepon</span>
                  <span className="text-sm font-medium text-gray-900">{formData.phone}</span>
                </div>
                {formData.email && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Email</span>
                    <span className="text-sm font-medium text-gray-900">{formData.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Tipe Customer</span>
                  <span className="text-sm font-medium text-gray-900">{formData.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Membership Level</span>
                  <span className="text-sm font-medium text-gray-900">{formData.membershipLevel}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            onClick={currentStep === 1 ? handleClose : handleBack}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
          >
            {currentStep === 1 ? (
              <>
                <span>Batal</span>
              </>
            ) : (
              <>
                <FaArrowLeft />
                <span>Kembali</span>
              </>
            )}
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-md hover:from-red-700 hover:to-orange-600 flex items-center space-x-2"
            >
              <span>Lanjut</span>
              <FaArrowRight />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-md hover:from-green-700 hover:to-green-600 flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <FaCheck />
                  <span>Simpan Pelanggan</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddCustomerWizard;
