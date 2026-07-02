import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useTranslation } from '@/lib/i18n';
import { ArrowRight, ArrowLeft, Check, Loader, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PackageSelector from '@/components/packages/PackageSelector';
import PackageActivationModal from '@/components/packages/PackageActivationModal';

export default function PackageSelection() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [activating, setActivating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const handlePackageSelected = (packageId: string, packageData: any) => {
    setSelectedPackage(packageData);
  };
  
  const handleShowActivationModal = () => {
    if (!selectedPackage) {
      toast.error('Pilih paket terlebih dahulu');
      return;
    }
    setShowModal(true);
  };
  
  const handleActivatePackage = async () => {
    if (!selectedPackage) return;
    
    setActivating(true);
    try {
      const response = await fetch(`/api/packages/${selectedPackage.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Success messages
        toast.success(`🎉 Paket "${selectedPackage.name}" berhasil diaktifkan!`, {
          duration: 4000,
          icon: '✅'
        });
        
        if (data.data.modulesEnabled) {
          toast.success(`📦 ${data.data.modulesEnabled} modul telah diaktifkan`, {
            duration: 3000
          });
        }
        
        if (data.data.dashboardConfigured) {
          toast.success(`📊 Dashboard khusus telah dikonfigurasi`, {
            duration: 3000,
            icon: '✨'
          });
        }
        
        // Close modal and redirect
        setShowModal(false);
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        toast.error(data.error || 'Gagal mengaktifkan paket');
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error activating package:', error);
      toast.error('Gagal mengaktifkan paket');
      setShowModal(false);
    } finally {
      setActivating(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <Check className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">Business Type</span>
            </div>
            <div className="w-16 h-1 bg-blue-500"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <span className="text-sm font-medium text-blue-600">Pilih Paket</span>
            </div>
            <div className="w-16 h-1 bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
                3
              </div>
              <span className="text-sm font-medium text-gray-500">Selesai</span>
            </div>
          </div>
        </div>
        
        {/* Package Selector */}
        <PackageSelector
          industryType="fnb"
          onPackageSelected={handlePackageSelected}
        />
        
        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </button>
          
          <button
            onClick={handleShowActivationModal}
            disabled={!selectedPackage || activating}
            className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
              selectedPackage && !activating
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {activating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Mengaktifkan...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Aktifkan Paket
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
        
        {/* Package Details Preview */}
        {selectedPackage && (
          <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ringkasan Paket: {selectedPackage.name}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Modul yang Akan Diaktifkan:</h4>
                <ul className="space-y-2">
                  {selectedPackage.modules?.slice(0, 10).map((module: any) => (
                    <li key={module.id} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-700">{module.name}</span>
                      {module.isRequired && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Fitur Utama:</h4>
                <ul className="space-y-2">
                  {selectedPackage.features?.map((feature: any) => (
                    <li key={feature.code} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-700">{feature.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Catatan:</strong> Semua modul dan dependensinya akan otomatis diaktifkan. 
                Anda dapat mengatur konfigurasi lebih lanjut setelah setup selesai.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Activation Modal */}
      <PackageActivationModal
        isOpen={showModal}
        onClose={() => !activating && setShowModal(false)}
        packageData={selectedPackage}
        onConfirm={handleActivatePackage}
      />
    </div>
  );
}
