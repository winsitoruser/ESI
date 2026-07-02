import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../../../components/hq/HQLayout';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  User,
  CreditCard,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Info,
  Phone,
  Mail,
  MapPin,
  Globe,
  Hash,
  Shield,
  Clock,
  Send,
  Save,
  Eye,
  X,
  Plus,
  Check
} from 'lucide-react';

interface ApplicationField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'file' | 'date';
  options?: string[];
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

interface Provider {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  logo?: string;
  applicationFields: ApplicationField[];
  requiredDocuments: string[];
  estimatedProcessingDays: number;
  features: string[];
}

const steps = [
  { id: 1, name: 'Informasi Bisnis', icon: Building2 },
  { id: 2, name: 'Pemilik/PIC', icon: User },
  { id: 3, name: 'Rekening Bank', icon: CreditCard },
  { id: 4, name: 'Dokumen', icon: FileText },
  { id: 5, name: 'Review', icon: CheckCircle }
];

export default function IntegrationRequestPage() {
  const router = useRouter();
  const { provider: providerCode, branch } = router.query;
  
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [ownerData, setOwnerData] = useState({
    name: '',
    nik: '',
    phone: '',
    email: '',
    position: 'Pemilik'
  });
  const [bankData, setBankData] = useState({
    bank_name: '',
    account_number: '',
    account_name: ''
  });
  const [documents, setDocuments] = useState<Record<string, File | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (providerCode && typeof providerCode === 'string') {
      fetch(`/api/hq/integrations/providers?code=${providerCode}`)
        .then(r => r.json())
        .then(json => { const p = json.data || json; if (p) setProvider(p); })
        .catch(err => console.error('Error fetching provider:', err));
    }
  }, [providerCode]);

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleOwnerChange = (key: string, value: string) => {
    setOwnerData(prev => ({ ...prev, [key]: value }));
  };

  const handleBankChange = (key: string, value: string) => {
    setBankData(prev => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (key: string, file: File | null) => {
    setDocuments(prev => ({ ...prev, [key]: file }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1 && provider) {
      (provider.applicationFields || []).forEach(field => {
        if (field.required && !formData[field.key]) {
          newErrors[field.key] = `${field.label} wajib diisi`;
        }
      });
    }

    if (step === 2) {
      if (!ownerData.name) newErrors['owner_name'] = 'Nama wajib diisi';
      if (!ownerData.nik) newErrors['owner_nik'] = 'NIK wajib diisi';
      if (!ownerData.phone) newErrors['owner_phone'] = 'Telepon wajib diisi';
      if (!ownerData.email) newErrors['owner_email'] = 'Email wajib diisi';
    }

    if (step === 3) {
      if (!bankData.bank_name) newErrors['bank_name'] = 'Nama bank wajib diisi';
      if (!bankData.account_number) newErrors['bank_account'] = 'Nomor rekening wajib diisi';
      if (!bankData.account_name) newErrors['bank_account_name'] = 'Nama pemilik rekening wajib diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      alert('Anda harus menyetujui syarat dan ketentuan');
      return;
    }

    setLoading(true);
    try {
      const documentsSummary: Record<string, any> = {};
      Object.entries(documents).forEach(([k, f]) => {
        if (f) {
          documentsSummary[k] = {
            filename: f.name,
            size: f.size,
            uploadedAt: new Date().toISOString()
          };
        }
      });

      const res = await fetch('/api/hq/integrations/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider?.id,
          requestType: 'new_merchant',
          businessInfo: formData,
          ownerInfo: ownerData,
          bankInfo: bankData,
          documents: documentsSummary,
          status: 'submitted'
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Gagal mengirim pengajuan');
      }
      router.push('/hq/settings/integrations?tab=requests&success=true');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      alert(error.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    alert('Draft berhasil disimpan');
  };

  if (!mounted || !provider) {
    return (
      <HQLayout title="Memuat..." subtitle="">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </HQLayout>
    );
  }

  return (
    <HQLayout 
      title={`Pengajuan ${provider.name}`} 
      subtitle="Lengkapi formulir untuk mengajukan integrasi"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        {/* Provider Info */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{provider.name}</h2>
              <p className="text-white/80 mt-1">{provider.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {(provider.features || []).slice(0, 5).map((feature, idx) => (
                  <span key={idx} className="px-3 py-1 bg-white/20 rounded-full text-sm">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-white/80">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Estimasi {provider.estimatedProcessingDays} hari kerja</span>
              </div>
            </div>
          </div>
        </div>

        {/* Steps Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep > step.id 
                      ? 'bg-emerald-500 text-white' 
                      : currentStep === step.id 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-2 ${
                    currentStep >= step.id ? 'text-gray-900 font-medium' : 'text-gray-400'
                  }`}>
                    {step.name}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Step 1: Business Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Informasi Bisnis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(provider.applicationFields || []).map(field => (
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                          errors[field.key] ? 'border-red-300' : 'border-gray-200'
                        }`}
                      >
                        <option value="">Pilih {field.label}</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                          errors[field.key] ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                          errors[field.key] ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                    )}
                    {field.helpText && (
                      <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                    )}
                    {errors[field.key] && (
                      <p className="text-xs text-red-500 mt-1">{errors[field.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Owner Info */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Informasi Pemilik / PIC</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ownerData.name}
                    onChange={(e) => handleOwnerChange('name', e.target.value)}
                    placeholder="Sesuai KTP"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIK <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ownerData.nik}
                    onChange={(e) => handleOwnerChange('nik', e.target.value)}
                    placeholder="16 digit NIK"
                    maxLength={16}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jabatan
                  </label>
                  <select
                    value={ownerData.position}
                    onChange={(e) => handleOwnerChange('position', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Pemilik">Pemilik</option>
                    <option value="Direktur">Direktur</option>
                    <option value="Manager">Manager</option>
                    <option value="PIC">PIC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor Telepon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={ownerData.phone}
                    onChange={(e) => handleOwnerChange('phone', e.target.value)}
                    placeholder="+62812xxxxxxxx"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={ownerData.email}
                    onChange={(e) => handleOwnerChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Bank Info */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Informasi Rekening Bank</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Rekening ini akan digunakan untuk settlement dana dari transaksi. Pastikan nama pemilik rekening sesuai dengan nama bisnis atau pemilik yang terdaftar.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Bank <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bankData.bank_name}
                    onChange={(e) => handleBankChange('bank_name', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Pilih Bank</option>
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="BNI">BNI</option>
                    <option value="BRI">BRI</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                    <option value="Permata">Permata</option>
                    <option value="Danamon">Danamon</option>
                    <option value="Other">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor Rekening <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankData.account_number}
                    onChange={(e) => handleBankChange('account_number', e.target.value)}
                    placeholder="Nomor rekening"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Pemilik Rekening <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankData.account_name}
                    onChange={(e) => handleBankChange('account_name', e.target.value)}
                    placeholder="Sesuai buku rekening"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Upload Dokumen</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium">Format yang diterima:</p>
                    <p className="text-sm text-amber-700">JPG, PNG, PDF (maks. 5MB per file)</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {(provider.requiredDocuments || []).map((doc, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{doc}</p>
                          <p className="text-xs text-gray-500">
                            {documents[doc] ? documents[doc]?.name : 'Belum diupload'}
                          </p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {documents[doc] ? 'Ganti' : 'Upload'}
                        </span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileChange(doc, e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Review Pengajuan</h3>
              
              {/* Business Info Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Informasi Bisnis
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(formData).slice(0, 6).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-gray-500">{key.replace(/_/g, ' ')}:</span>
                      <span className="ml-2 font-medium text-gray-900">{value || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Owner Info Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Pemilik / PIC
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Nama:</span>
                    <span className="ml-2 font-medium text-gray-900">{ownerData.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">NIK:</span>
                    <span className="ml-2 font-medium text-gray-900">{ownerData.nik || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Telepon:</span>
                    <span className="ml-2 font-medium text-gray-900">{ownerData.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 font-medium text-gray-900">{ownerData.email || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Bank Info Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Rekening Bank
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Bank:</span>
                    <span className="ml-2 font-medium text-gray-900">{bankData.bank_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">No. Rekening:</span>
                    <span className="ml-2 font-medium text-gray-900">{bankData.account_number || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Atas Nama:</span>
                    <span className="ml-2 font-medium text-gray-900">{bankData.account_name || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Documents Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Dokumen
                </h4>
                <div className="space-y-2">
                  {(provider.requiredDocuments || []).map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{doc}</span>
                      {documents[doc] ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="w-4 h-4" />
                          Belum upload
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">
                    Saya menyatakan bahwa semua informasi yang saya berikan adalah benar dan lengkap. 
                    Saya telah membaca dan menyetujui{' '}
                    <a href="#" className="text-indigo-600 hover:underline">Syarat dan Ketentuan</a> serta{' '}
                    <a href="#" className="text-indigo-600 hover:underline">Kebijakan Privasi</a>.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Sebelumnya
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                Simpan Draft
              </button>
              {currentStep < steps.length ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Selanjutnya
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !agreedToTerms}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Kirim Pengajuan
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
