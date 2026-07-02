import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from '@/lib/i18n';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, ArrowLeft, ArrowRight, Building2, Shield, Upload, MapPin,
  GitBranch, MessageSquare, Check, AlertCircle, Loader2, Save,
  Send, ChevronLeft, FileText, X, Plus, Camera, Briefcase,
  Users, Calendar, DollarSign, Phone, Mail, Hash,
  Building, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getProvinces, getCities, getDistricts } from '../../data/regions';

interface KybFormData {
  // Step 1
  businessName: string;
  businessCategory: string;
  businessSubcategory: string;
  businessDuration: string;
  businessDescription: string;
  employeeCount: string;
  annualRevenue: string;
  // Step 2
  legalEntityType: string;
  legalEntityName: string;
  nibNumber: string;
  siupNumber: string;
  npwpNumber: string;
  ktpNumber: string;
  ktpName: string;
  // Step 4
  picName: string;
  picPhone: string;
  picEmail: string;
  picPosition: string;
  businessAddress: string;
  businessCity: string;
  businessProvince: string;
  businessPostalCode: string;
  businessDistrict: string;
  // Step 5
  businessStructure: string;
  plannedBranchCount: number;
  // Step 6
  additionalNotes: string;
  referralSource: string;
  expectedStartDate: string;
}

const defaultFormData: KybFormData = {
  businessName: '',
  businessCategory: '',
  businessSubcategory: '',
  businessDuration: '',
  businessDescription: '',
  employeeCount: '',
  annualRevenue: '',
  legalEntityType: '',
  legalEntityName: '',
  nibNumber: '',
  siupNumber: '',
  npwpNumber: '',
  ktpNumber: '',
  ktpName: '',
  picName: '',
  picPhone: '',
  picEmail: '',
  picPosition: '',
  businessAddress: '',
  businessCity: '',
  businessProvince: '',
  businessPostalCode: '',
  businessDistrict: '',
  businessStructure: 'single',
  plannedBranchCount: 1,
  additionalNotes: '',
  referralSource: '',
  expectedStartDate: '',
};

const businessCategories = [
  { value: 'fnb', label: 'F&B / Restoran', icon: '🍽️' },
  { value: 'retail', label: 'Retail / Toko', icon: '🏪' },
  { value: 'fashion', label: 'Fashion & Apparel', icon: '👔' },
  { value: 'beauty', label: 'Beauty & Salon', icon: '💄' },
  { value: 'grocery', label: 'Grocery / Supermarket', icon: '🛒' },
  { value: 'pharmacy', label: 'Apotek / Farmasi', icon: '💊' },
  { value: 'electronics', label: 'Elektronik', icon: '📱' },
  { value: 'automotive', label: 'Otomotif', icon: '🚗' },
  { value: 'services', label: 'Jasa / Layanan', icon: '🔧' },
  { value: 'other', label: 'Lainnya', icon: '📦' },
];

const durationOptions = [
  { value: 'less_than_1', label: 'Kurang dari 1 tahun' },
  { value: '1_to_3', label: '1 - 3 tahun' },
  { value: '3_to_5', label: '3 - 5 tahun' },
  { value: '5_to_10', label: '5 - 10 tahun' },
  { value: 'more_than_10', label: 'Lebih dari 10 tahun' },
];

const employeeOptions = [
  { value: '1_5', label: '1 - 5 orang' },
  { value: '6_15', label: '6 - 15 orang' },
  { value: '16_50', label: '16 - 50 orang' },
  { value: '51_100', label: '51 - 100 orang' },
  { value: '100_plus', label: '100+ orang' },
];

const revenueOptions = [
  { value: 'under_50m', label: '< Rp 50 juta/bulan' },
  { value: '50m_200m', label: 'Rp 50 - 200 juta/bulan' },
  { value: '200m_500m', label: 'Rp 200 - 500 juta/bulan' },
  { value: '500m_1b', label: 'Rp 500 juta - 1 miliar/bulan' },
  { value: 'over_1b', label: '> Rp 1 miliar/bulan' },
];

const legalEntityTypes = [
  { value: 'perorangan', label: 'Perorangan / Pribadi', desc: 'Usaha tanpa badan hukum', icon: '👤' },
  { value: 'ud', label: 'UD (Usaha Dagang)', desc: 'Usaha dagang perseorangan', icon: '🏠' },
  { value: 'cv', label: 'CV (Commanditaire Vennootschap)', desc: 'Persekutuan komanditer', icon: '🤝' },
  { value: 'pt', label: 'PT (Perseroan Terbatas)', desc: 'Badan hukum perseroan', icon: '🏢' },
  { value: 'koperasi', label: 'Koperasi', desc: 'Badan usaha koperasi', icon: '🤲' },
];

const provinces = getProvinces();

const referralSources = [
  { value: 'google', label: 'Google / Pencarian' },
  { value: 'social_media', label: 'Media Sosial' },
  { value: 'friend', label: 'Rekomendasi Teman' },
  { value: 'partner', label: 'Partner / Distributor' },
  { value: 'event', label: 'Event / Pameran' },
  { value: 'ads', label: 'Iklan Online' },
  { value: 'other', label: 'Lainnya' },
];

const steps = [
  { number: 1, title: 'Identitas Bisnis', icon: Building2 },
  { number: 2, title: 'Status Legalitas', icon: Shield },
  { number: 3, title: 'Upload Dokumen', icon: Upload },
  { number: 4, title: 'PIC & Alamat', icon: MapPin },
  { number: 5, title: 'Struktur Bisnis', icon: GitBranch },
  { number: 6, title: 'Review & Submit', icon: MessageSquare },
];

// Input component helpers - MOVED OUTSIDE to prevent re-creation on every render
const InputField = ({ label, name, placeholder, type = 'text', required = false, icon: Icon, hint, value, onChange, error }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />}
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition text-sm ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-200'
        }`}
        placeholder={placeholder}
      />
    </div>
    {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && (
      <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
        <AlertCircle className="w-3 h-3" />
        <span>{error}</span>
      </p>
    )}
  </div>
);

const SelectField = ({ label, name, options, required = false, placeholder = 'Pilih...', value, onChange, error }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      name={name}
      value={value || ''}
      onChange={onChange}
      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition text-sm appearance-none bg-white ${
        error ? 'border-red-400 bg-red-50' : 'border-gray-200'
      }`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && (
      <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
        <AlertCircle className="w-3 h-3" />
        <span>{error}</span>
      </p>
    )}
  </div>
);

export default function KybForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<KybFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [kybId, setKybId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    if (sessionStatus === 'authenticated') {
      loadKybData();
    }
  }, [sessionStatus]);

  const loadKybData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding/kyb');
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Load KYB error:', res.status, errorText);
        
        if (res.status === 400) {
          toast.error('Tenant tidak ditemukan. Silakan lengkapi welcome step terlebih dahulu.');
          router.push('/onboarding/welcome');
          return;
        }
        
        toast.error(`Gagal memuat data KYB: ${res.status}`);
        return;
      }
      
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setKybId(d.id);
        setDocuments(d.documents || []);
        setCurrentStep(d.currentStep || 1);
        
        console.log('KYB loaded successfully, ID:', d.id);
        
        setFormData({
          businessName: d.businessName || '',
          businessCategory: d.businessCategory || '',
          businessSubcategory: d.businessSubcategory || '',
          businessDuration: d.businessDuration || '',
          businessDescription: d.businessDescription || '',
          employeeCount: d.employeeCount || '',
          annualRevenue: d.annualRevenue || '',
          legalEntityType: d.legalEntityType || '',
          legalEntityName: d.legalEntityName || '',
          nibNumber: d.nibNumber || '',
          siupNumber: d.siupNumber || '',
          npwpNumber: d.npwpNumber || '',
          ktpNumber: d.ktpNumber || '',
          ktpName: d.ktpName || '',
          picName: d.picName || '',
          picPhone: d.picPhone || '',
          picEmail: d.picEmail || '',
          picPosition: d.picPosition || '',
          businessAddress: d.businessAddress || '',
          businessCity: d.businessCity || '',
          businessProvince: d.businessProvince || '',
          businessPostalCode: d.businessPostalCode || '',
          businessDistrict: d.businessDistrict || '',
          businessStructure: d.businessStructure || 'single',
          plannedBranchCount: d.plannedBranchCount || 1,
          additionalNotes: d.additionalNotes || '',
          referralSource: d.referralSource || '',
          expectedStartDate: d.expectedStartDate || '',
        });
      }
    } catch (err) {
      toast.error('Gagal memuat data KYB');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const setField = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.businessName.trim()) newErrors.businessName = 'Nama bisnis wajib diisi';
      if (!formData.businessCategory) newErrors.businessCategory = 'Pilih kategori bisnis';
      if (!formData.businessDuration) newErrors.businessDuration = 'Pilih lama usaha berjalan';
    }

    if (step === 2) {
      if (!formData.legalEntityType) newErrors.legalEntityType = 'Pilih bentuk badan usaha';
      if (!formData.ktpNumber.trim()) newErrors.ktpNumber = 'Nomor KTP wajib diisi';
      if (formData.ktpNumber && formData.ktpNumber.length !== 16) newErrors.ktpNumber = 'Nomor KTP harus 16 digit';
      if (!formData.ktpName.trim()) newErrors.ktpName = 'Nama sesuai KTP wajib diisi';
    }

    if (step === 4) {
      if (!formData.picName.trim()) newErrors.picName = 'Nama PIC wajib diisi';
      if (!formData.picPhone.trim()) newErrors.picPhone = 'Nomor telepon PIC wajib diisi';
      if (!formData.businessAddress.trim()) newErrors.businessAddress = 'Alamat usaha wajib diisi';
      if (!formData.businessCity.trim()) newErrors.businessCity = 'Kota wajib diisi';
      if (!formData.businessProvince) newErrors.businessProvince = 'Provinsi wajib dipilih';
    }

    if (step === 5) {
      if (!formData.businessStructure) newErrors.businessStructure = 'Pilih struktur bisnis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveProgress = async (nextStep?: number) => {
    if (!kybId) {
      console.error('Cannot save: KYB ID not found');
      toast.error('KYB belum dimuat. Silakan refresh halaman.');
      return false;
    }
    
    setSaving(true);
    try {
      console.log('Saving KYB data, ID:', kybId, 'Step:', nextStep || currentStep);
      
      const res = await fetch('/api/onboarding/kyb', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          currentStep: nextStep || currentStep,
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Save error response:', errorText);
        toast.error(`Gagal menyimpan data: ${res.status}`);
        return false;
      }
      
      const json = await res.json();
      if (!json.success) {
        console.error('Save failed:', json);
        toast.error(json.message || 'Gagal menyimpan data');
        return false;
      }
      
      console.log('Data saved successfully');
      return true;
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`Gagal menyimpan data: ${error.message}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === 3) {
      // Documents step - no validation needed, just save and move
      const saved = await saveProgress(currentStep + 1);
      if (saved) {
        setCurrentStep(currentStep + 1);
      }
      return;
    }
    if (validateStep(currentStep)) {
      const saved = await saveProgress(currentStep + 1);
      if (saved) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast.error('Mohon lengkapi field yang wajib diisi');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Save latest data first
      await saveProgress();

      const res = await fetch('/api/onboarding/kyb?action=submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        toast.success('KYB berhasil disubmit! Tim kami akan mereview data Anda.');
        // Refresh session token so middleware sees updated kybStatus
        await updateSession();
        router.push('/hq/home');
      } else {
        toast.error(json.message || 'Gagal submit KYB');
      }
    } catch {
      toast.error('Gagal submit KYB');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>KYB - Know Your Business | BEDAGANG</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/onboarding" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Kembali</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Store className="w-5 h-5 text-sky-600" />
              <span className="font-bold text-sky-600">KYB</span>
            </div>
            <button
              onClick={() => saveProgress()}
              disabled={saving}
              className="flex items-center space-x-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan</span>
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > step.number;
                const isCurrent = currentStep === step.number;
                return (
                  <React.Fragment key={step.number}>
                    <button
                      onClick={() => {
                        if (isCompleted || isCurrent) setCurrentStep(step.number);
                      }}
                      className={`flex flex-col items-center transition-all ${
                        isCompleted || isCurrent ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all ${
                        isCompleted ? 'bg-emerald-500 text-white' :
                        isCurrent ? 'bg-sky-500 text-white shadow-lg scale-110' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${
                        isCurrent ? 'text-sky-600' : isCompleted ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
                        {step.title}
                      </span>
                    </button>
                    {idx < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                        currentStep > step.number ? 'bg-emerald-400' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8"
            >
              {/* Step 1: Business Identity */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Identitas Bisnis</h3>
                    <p className="text-sm text-gray-500">Ceritakan tentang usaha Anda</p>
                  </div>

                  <InputField label="Nama Bisnis / Usaha" name="businessName" placeholder="Contoh: Warung Makan Berkah" required icon={Building2} value={formData.businessName} onChange={handleChange} error={errors.businessName} />

                  {/* Business Category Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori Bisnis <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {businessCategories.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setField('businessCategory', cat.value)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            formData.businessCategory === cat.value
                              ? 'border-sky-500 bg-sky-50 shadow-sm'
                              : 'border-gray-200 hover:border-sky-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{cat.icon}</span>
                            <span className="text-xs font-medium text-gray-800">{cat.label}</span>
                          </div>
                          {formData.businessCategory === cat.value && (
                            <Check className="w-4 h-4 text-sky-600 absolute top-2 right-2" />
                          )}
                        </button>
                      ))}
                    </div>
                    {errors.businessCategory && (
                      <p className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.businessCategory}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField label="Lama Usaha Berjalan" name="businessDuration" options={durationOptions} required value={formData.businessDuration} onChange={handleChange} error={errors.businessDuration} />
                    <SelectField label="Jumlah Karyawan" name="employeeCount" options={employeeOptions} value={formData.employeeCount} onChange={handleChange} error={errors.employeeCount} />
                  </div>

                  <SelectField label="Estimasi Omzet Bulanan" name="annualRevenue" options={revenueOptions} value={formData.annualRevenue} onChange={handleChange} error={errors.annualRevenue} />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi Bisnis</label>
                    <textarea
                      name="businessDescription"
                      value={formData.businessDescription}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition text-sm resize-none"
                      placeholder="Ceritakan singkat tentang bisnis Anda..."
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Legal Status */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Status Legalitas</h3>
                    <p className="text-sm text-gray-500">Informasi badan hukum dan dokumen legalitas</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bentuk Badan Usaha <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {legalEntityTypes.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setField('legalEntityType', type.value)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                            formData.legalEntityType === type.value
                              ? 'border-sky-500 bg-sky-50 shadow'
                              : 'border-gray-200 hover:border-sky-300'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{type.icon}</span>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{type.label}</div>
                              <div className="text-xs text-gray-500">{type.desc}</div>
                            </div>
                            {formData.legalEntityType === type.value && (
                              <Check className="w-5 h-5 text-sky-600 ml-auto" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    {errors.legalEntityType && (
                      <p className="mt-1 text-xs text-red-600"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.legalEntityType}</p>
                    )}
                  </div>

                  {formData.legalEntityType && formData.legalEntityType !== 'perorangan' && (
                    <>
                      <InputField label="Nama Badan Usaha" name="legalEntityName" placeholder="Contoh: PT Berkah Jaya Indonesia" icon={Building} value={formData.legalEntityName} onChange={handleChange} error={errors.legalEntityName} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Nomor NIB" name="nibNumber" placeholder="13 digit NIB" icon={Hash} hint="Nomor Induk Berusaha dari OSS" value={formData.nibNumber} onChange={handleChange} error={errors.nibNumber} />
                        <InputField label="Nomor SIUP" name="siupNumber" placeholder="Nomor SIUP" icon={FileText} value={formData.siupNumber} onChange={handleChange} error={errors.siupNumber} />
                      </div>
                    </>
                  )}

                  <InputField label="Nomor NPWP" name="npwpNumber" placeholder="XX.XXX.XXX.X-XXX.XXX" icon={Hash} hint="NPWP pribadi atau badan usaha" value={formData.npwpNumber} onChange={handleChange} error={errors.npwpNumber} />

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Data KTP Pemilik / Penanggung Jawab</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField label="Nama Sesuai KTP" name="ktpName" placeholder="Nama lengkap di KTP" required icon={Users} value={formData.ktpName} onChange={handleChange} error={errors.ktpName} />
                      <InputField label="Nomor KTP (NIK)" name="ktpNumber" placeholder="16 digit NIK" required icon={Hash} hint="Nomor Induk Kependudukan 16 digit" value={formData.ktpNumber} onChange={handleChange} error={errors.ktpNumber} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Documents */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Upload Dokumen</h3>
                    <p className="text-sm text-gray-500">Upload dokumen pendukung untuk verifikasi bisnis Anda</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Format yang diterima</p>
                        <p className="text-xs text-amber-700 mt-0.5">JPG, PNG, PDF — Maksimal 5MB per file</p>
                      </div>
                    </div>
                  </div>

                  {[
                    { type: 'ktp', label: 'Foto KTP Pemilik', required: true, desc: 'Foto jelas KTP asli (bukan fotokopi)' },
                    { type: 'npwp', label: 'Foto NPWP', required: false, desc: 'NPWP pribadi atau badan usaha' },
                    { type: 'nib', label: 'NIB / Surat Izin Usaha', required: false, desc: 'Nomor Induk Berusaha atau SIUP' },
                    { type: 'foto_outlet', label: 'Foto Outlet / Toko', required: true, desc: 'Foto tampak depan tempat usaha' },
                    { type: 'foto_interior', label: 'Foto Interior', required: false, desc: 'Foto bagian dalam tempat usaha' },
                  ].map(doc => {
                    const uploaded = documents.filter((d: any) => d.documentType === doc.type);
                    return (
                      <div key={doc.type} className={`p-4 rounded-xl border-2 ${
                        uploaded.length > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900 text-sm">{doc.label}</h4>
                              {doc.required && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Wajib</span>}
                              {uploaded.length > 0 && <Check className="w-4 h-4 text-emerald-500" />}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{doc.desc}</p>
                          </div>
                          <label className="cursor-pointer flex items-center space-x-1.5 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-sky-300 hover:text-sky-600 transition">
                            <Camera className="w-4 h-4" />
                            <span>{uploaded.length > 0 ? 'Ganti' : 'Upload'}</span>
                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('File terlalu besar. Maksimal 5MB.');
                                return;
                              }
                              const fd = new FormData();
                              fd.append('file', file);
                              fd.append('documentType', doc.type);
                              try {
                                toast.loading('Mengupload...', { id: 'upload' });
                                const res = await fetch('/api/onboarding/documents', { method: 'POST', body: fd });
                                const json = await res.json();
                                toast.dismiss('upload');
                                if (json.success) {
                                  toast.success(`"${file.name}" berhasil diupload`);
                                  // Refresh documents list
                                  const docsRes = await fetch('/api/onboarding/documents');
                                  const docsJson = await docsRes.json();
                                  if (docsJson.success) setDocuments(docsJson.data);
                                } else {
                                  toast.error(json.message || 'Gagal upload');
                                }
                              } catch { toast.dismiss('upload'); toast.error('Gagal upload file'); }
                              e.target.value = '';
                            }} />
                          </label>
                        </div>
                        {uploaded.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {uploaded.map((u: any) => (
                              <div key={u.id} className="flex items-center space-x-2 text-xs text-emerald-700">
                                <FileText className="w-3 h-3" />
                                <span>{u.documentName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <p className="text-xs text-gray-400 text-center">
                    Dokumen Anda aman dan hanya digunakan untuk verifikasi. Anda bisa melengkapi dokumen nanti.
                  </p>
                </div>
              )}

              {/* Step 4: PIC & Address */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">PIC & Alamat Usaha</h3>
                    <p className="text-sm text-gray-500">Informasi penanggung jawab dan lokasi usaha</p>
                  </div>

                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                      <Users className="w-4 h-4 text-sky-500" />
                      <span>Person In Charge (PIC)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField label="Nama PIC" name="picName" placeholder="Nama penanggung jawab" required icon={Users} value={formData.picName} onChange={handleChange} error={errors.picName} />
                      <InputField label="Jabatan" name="picPosition" placeholder="Contoh: Owner, Manager" icon={Briefcase} value={formData.picPosition} onChange={handleChange} error={errors.picPosition} />
                      <InputField label="No. Telepon PIC" name="picPhone" placeholder="08xxxxxxxxxx" required icon={Phone} value={formData.picPhone} onChange={handleChange} error={errors.picPhone} />
                      <InputField label="Email PIC" name="picEmail" placeholder="email@domain.com" type="email" icon={Mail} value={formData.picEmail} onChange={handleChange} error={errors.picEmail} />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-sky-500" />
                      <span>Alamat Usaha</span>
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Alamat Lengkap <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="businessAddress"
                          value={formData.businessAddress}
                          onChange={handleChange}
                          rows={2}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition text-sm resize-none ${
                            errors.businessAddress ? 'border-red-400 bg-red-50' : 'border-gray-200'
                          }`}
                          placeholder="Jalan, No. rumah, RT/RW, Kelurahan"
                        />
                        {errors.businessAddress && (
                          <p className="mt-1 text-xs text-red-600"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.businessAddress}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectField
                          label="Provinsi"
                          name="businessProvince"
                          options={provinces.map(p => ({ value: p, label: p }))}
                          required
                          value={formData.businessProvince}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              businessProvince: val,
                              businessCity: '',
                              businessDistrict: '',
                            }));
                            setErrors(prev => ({ ...prev, businessProvince: '', businessCity: '', businessDistrict: '' }));
                          }}
                          error={errors.businessProvince}
                        />
                        <SelectField
                          label="Kota / Kabupaten"
                          name="businessCity"
                          options={formData.businessProvince ? getCities(formData.businessProvince).map(c => ({ value: c, label: c })) : []}
                          required
                          placeholder={formData.businessProvince ? 'Pilih Kota/Kabupaten...' : 'Pilih Provinsi dahulu...'}
                          value={formData.businessCity}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              businessCity: val,
                              businessDistrict: '',
                            }));
                            setErrors(prev => ({ ...prev, businessCity: '', businessDistrict: '' }));
                          }}
                          error={errors.businessCity}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectField
                          label="Kecamatan"
                          name="businessDistrict"
                          options={formData.businessCity ? getDistricts(formData.businessProvince, formData.businessCity).map(d => ({ value: d, label: d })) : []}
                          placeholder={formData.businessCity ? 'Pilih Kecamatan...' : 'Pilih Kota/Kabupaten dahulu...'}
                          value={formData.businessDistrict}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            setFormData(prev => ({ ...prev, businessDistrict: e.target.value }));
                            setErrors(prev => ({ ...prev, businessDistrict: '' }));
                          }}
                          error={errors.businessDistrict}
                        />
                        <InputField label="Kode Pos" name="businessPostalCode" placeholder="Kode pos" icon={Hash} value={formData.businessPostalCode} onChange={handleChange} error={errors.businessPostalCode} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Business Structure */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Struktur Bisnis</h3>
                    <p className="text-sm text-gray-500">Pilih model operasional yang sesuai dengan bisnis Anda</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        value: 'single',
                        title: 'Single Outlet',
                        desc: 'Satu lokasi usaha. Cocok untuk toko tunggal, kafe, atau bisnis dengan satu tempat operasional.',
                        icon: '🏪',
                        features: ['Dashboard lengkap untuk 1 lokasi', 'Manajemen stok terintegrasi', 'Laporan penjualan komprehensif']
                      },
                      {
                        value: 'multi_branch',
                        title: 'Multi-Branch (HQ + Cabang)',
                        desc: 'Banyak cabang di bawah satu manajemen pusat (HQ). Cocok untuk bisnis franchise atau jaringan toko.',
                        icon: '🏢',
                        features: ['Dashboard HQ untuk monitoring semua cabang', 'Manajemen stok antar cabang', 'Laporan konsolidasi real-time', 'Transfer inventory antar cabang']
                      }
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setField('businessStructure', option.value)}
                        className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
                          formData.businessStructure === option.value
                            ? 'border-sky-500 bg-sky-50 shadow-lg'
                            : 'border-gray-200 hover:border-sky-300'
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <span className="text-4xl">{option.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-gray-900">{option.title}</h4>
                              {formData.businessStructure === option.value && (
                                <Check className="w-5 h-5 text-sky-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{option.desc}</p>
                            <ul className="mt-3 space-y-1">
                              {option.features.map((f, i) => (
                                <li key={i} className="text-xs text-gray-500 flex items-center space-x-1.5">
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {formData.businessStructure === 'multi_branch' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-3"
                    >
                      <h4 className="font-medium text-sky-900 text-sm">Detail Multi-Branch</h4>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Berapa cabang yang direncanakan?
                        </label>
                        <input
                          type="number"
                          name="plannedBranchCount"
                          min={2}
                          max={999}
                          value={formData.plannedBranchCount}
                          onChange={handleChange}
                          className="w-32 px-3 py-2 border-2 border-sky-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                        />
                      </div>
                      <p className="text-xs text-sky-700">
                        Anda akan mendapatkan akun HQ (Headquarters) sebagai pusat kontrol dan bisa menambahkan cabang setelah aktivasi.
                      </p>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Step 6: Review & Submit */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Keterangan Tambahan & Review</h3>
                    <p className="text-sm text-gray-500">Tambahkan catatan dan review data sebelum submit</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan Tambahan</label>
                    <textarea
                      name="additionalNotes"
                      value={formData.additionalNotes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition text-sm resize-none"
                      placeholder="Informasi tambahan yang ingin disampaikan..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField label="Dari mana Anda tahu Bedagang?" name="referralSource" options={referralSources} value={formData.referralSource} onChange={handleChange} error={errors.referralSource} />
                    <InputField label="Target Mulai Beroperasi" name="expectedStartDate" type="date" icon={Calendar} value={formData.expectedStartDate} onChange={handleChange} error={errors.expectedStartDate} />
                  </div>

                  {/* Summary */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-bold text-gray-900 mb-3">Ringkasan Data</h4>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                      {[
                        { label: 'Nama Bisnis', value: formData.businessName },
                        { label: 'Kategori', value: businessCategories.find(c => c.value === formData.businessCategory)?.label || '-' },
                        { label: 'Badan Usaha', value: legalEntityTypes.find(l => l.value === formData.legalEntityType)?.label || '-' },
                        { label: 'PIC', value: formData.picName || '-' },
                        { label: 'Telepon PIC', value: formData.picPhone || '-' },
                        { label: 'Alamat', value: [formData.businessAddress, formData.businessCity, formData.businessProvince].filter(Boolean).join(', ') || '-' },
                        { label: 'Struktur', value: formData.businessStructure === 'multi_branch' ? `Multi-Branch (${formData.plannedBranchCount} cabang)` : 'Single Outlet' },
                        { label: 'Dokumen', value: `${documents.length} file terupload` },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start justify-between">
                          <span className="text-gray-500 flex-shrink-0 w-32">{item.label}</span>
                          <span className="text-gray-900 font-medium text-right">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                    <p className="text-sm text-sky-800">
                      Dengan menekan tombol <strong>Submit KYB</strong>, Anda menyatakan bahwa data yang diberikan adalah benar dan dapat diverifikasi. Tim kami akan meninjau data Anda dalam <strong>1-2 hari kerja</strong>.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                onClick={prevStep}
                className="flex items-center space-x-2 px-5 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
            ) : <div />}

            {currentStep < 6 ? (
              <button
                onClick={nextStep}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Lanjutkan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Submit KYB</span>
              </button>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
