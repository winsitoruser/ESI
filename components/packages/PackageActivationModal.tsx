import { useState } from 'react';
import { X, Check, Loader, AlertCircle, Package, Zap } from 'lucide-react';

interface PackageActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageData: any;
  onConfirm: () => Promise<void>;
}

export default function PackageActivationModal({
  isOpen,
  onClose,
  packageData,
  onConfirm
}: PackageActivationModalProps) {
  const [activating, setActivating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  
  if (!isOpen || !packageData) return null;
  
  const handleActivate = async () => {
    setActivating(true);
    setProgress(0);
    
    try {
      // Simulate progress steps
      setCurrentStep('Memvalidasi paket...');
      setProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCurrentStep('Mengaktifkan modul...');
      setProgress(40);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCurrentStep('Mengkonfigurasi dashboard...');
      setProgress(60);
      
      // Actual activation
      await onConfirm();
      
      setProgress(80);
      setCurrentStep('Finalisasi...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProgress(100);
      setCurrentStep('Selesai!');
      
    } catch (error) {
      console.error('Activation error:', error);
      setActivating(false);
      setProgress(0);
      setCurrentStep('');
    }
  };
  
  const requiredModules = packageData.modules?.filter((m: any) => m.isRequired) || [];
  const optionalModules = packageData.modules?.filter((m: any) => !m.isRequired) || [];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Konfirmasi Aktivasi Paket</h2>
          {!activating && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Package Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
                style={{ backgroundColor: packageData.color }}
              >
                <Package className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {packageData.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {packageData.description}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-blue-600">
                    {packageData.moduleCount} Modul
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="font-semibold text-purple-600">
                    {packageData.featureCount} Fitur
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* What will happen */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Yang Akan Dilakukan:
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Mengaktifkan <strong>{requiredModules.length} modul wajib</strong></span>
              </li>
              {optionalModules.length > 0 && (
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Mengaktifkan <strong>{optionalModules.length} modul optional</strong></span>
                </li>
              )}
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Mengkonfigurasi <strong>dashboard khusus</strong> untuk industri Anda</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Menyelesaikan <strong>semua dependencies</strong> secara otomatis</span>
              </li>
            </ul>
          </div>
          
          {/* Modules List */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Modul yang Akan Diaktifkan:</h4>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {packageData.modules?.map((module: any) => (
                <div
                  key={module.id}
                  className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg"
                >
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{module.name}</span>
                  {module.isRequired && (
                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded ml-auto">
                      Required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Progress */}
          {activating && (
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <Loader className="w-6 h-6 text-blue-600 animate-spin" />
                <span className="font-semibold text-blue-900">{currentStep}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-blue-700 mt-2 text-center">
                {progress}% selesai
              </p>
            </div>
          )}
          
          {/* Warning */}
          {!activating && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Catatan Penting:</p>
                <p>
                  Proses aktivasi akan memakan waktu beberapa detik. 
                  Pastikan koneksi internet Anda stabil dan jangan tutup halaman ini.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          {!activating ? (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleActivate}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg transition-all flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Ya, Aktifkan Sekarang
              </button>
            </>
          ) : (
            <div className="text-sm text-gray-600">
              Mohon tunggu, sedang memproses...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
