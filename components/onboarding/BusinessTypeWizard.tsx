import { useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import {
  Check, ChevronRight, ChevronLeft, Utensils, Coffee,
  Truck, Zap, Building2, Users, Settings, Sparkles
} from 'lucide-react';
import ModuleSelector from '@/components/modules/ModuleSelector';

interface BusinessType {
  code: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  features: string[];
}

const businessTypes: BusinessType[] = [
  {
    code: 'fine_dining',
    name: 'Fine Dining Restaurant',
    description: 'Full-service restaurant with table service and reservations',
    icon: Utensils,
    color: 'from-purple-500 to-pink-500',
    features: [
      'Table management & floor plan',
      'Reservation system',
      'Multi-course tracking',
      'Waiter assignment',
      'Advanced kitchen display'
    ]
  },
  {
    code: 'cloud_kitchen',
    name: 'Cloud Kitchen',
    description: 'Delivery-focused kitchen without dine-in service',
    icon: Truck,
    color: 'from-blue-500 to-cyan-500',
    features: [
      'Delivery management',
      'Online ordering integration',
      'Packing station KDS',
      'Order tracking',
      'Delivery partner integration'
    ]
  },
  {
    code: 'qsr',
    name: 'Quick Service Restaurant',
    description: 'Fast-food or quick-service restaurant',
    icon: Zap,
    color: 'from-orange-500 to-red-500',
    features: [
      'Quick order mode',
      'Combo meals',
      'Fast prep tracking',
      'Counter service',
      'Minimal table management'
    ]
  },
  {
    code: 'cafe',
    name: 'Cafe & Coffee Shop',
    description: 'Beverage-focused establishment with light food',
    icon: Coffee,
    color: 'from-amber-500 to-yellow-500',
    features: [
      'Beverage-focused inventory',
      'Coffee recipe management',
      'Simple table management',
      'Self-service option',
      'Loyalty program'
    ]
  }
];

export default function BusinessTypeWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(false);
  
  const steps = [
    { id: 1, name: 'Business Type', icon: Building2 },
    { id: 2, name: 'Select Modules', icon: Settings },
    { id: 3, name: 'Review & Confirm', icon: Check }
  ];
  
  const handleBusinessTypeSelect = (code: string) => {
    setSelectedBusinessType(code);
  };
  
  const handleContinueFromBusinessType = () => {
    if (!selectedBusinessType) {
      toast.error('Please select a business type');
      return;
    }
    setStep(2);
  };
  
  const handleModulesSelected = (moduleIds: string[]) => {
    setSelectedModules(moduleIds);
    setStep(3);
  };
  
  const handleConfirm = async () => {
    setIsConfiguring(true);
    
    try {
      const response = await fetch('/api/modules/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: selectedBusinessType,
          moduleIds: selectedModules
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('System configured successfully! 🎉');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        toast.error(data.error || 'Configuration failed');
        setIsConfiguring(false);
      }
    } catch (error) {
      console.error('Configuration error:', error);
      toast.error('Failed to configure system');
      setIsConfiguring(false);
    }
  };
  
  const selectedBT = businessTypes.find(bt => bt.code === selectedBusinessType);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Setup Your F&B System
          </h1>
          <p className="text-lg text-gray-600">
            Let's configure the perfect system for your business
          </p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step >= s.id;
              const isCurrent = step === s.id;
              
              return (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center ${isCurrent ? 'scale-110' : ''} transition-transform`}>
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      {step > s.id ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="ml-3 hidden md:block">
                      <p className={`text-sm font-medium ${
                        isActive ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        Step {s.id}
                      </p>
                      <p className={`text-xs ${
                        isActive ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {s.name}
                      </p>
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`w-24 h-1 mx-4 ${
                      step > s.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 1: Business Type Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Choose Your Business Type
                </h2>
                <p className="text-gray-600">
                  This helps us recommend the right modules for you
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {businessTypes.map(bt => {
                  const Icon = bt.icon;
                  const isSelected = selectedBusinessType === bt.code;
                  
                  return (
                    <div
                      key={bt.code}
                      onClick={() => handleBusinessTypeSelect(bt.code)}
                      className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}
                      
                      <div className={`w-16 h-16 bg-gradient-to-br ${bt.color} rounded-xl flex items-center justify-center mb-4`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {bt.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {bt.description}
                      </p>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-700 uppercase">
                          Includes:
                        </p>
                        {bt.features.slice(0, 3).map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                        {bt.features.length > 3 && (
                          <p className="text-xs text-gray-500 italic">
                            +{bt.features.length - 3} more features
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-end pt-6">
                <button
                  onClick={handleContinueFromBusinessType}
                  disabled={!selectedBusinessType}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          
          {/* Step 2: Module Selection */}
          {step === 2 && (
            <div>
              <ModuleSelector
                businessType={selectedBusinessType}
                onModulesSelected={handleModulesSelected}
              />
              
              <div className="flex justify-between pt-6 border-t mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>
              </div>
            </div>
          )}
          
          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Review Your Configuration
                </h2>
                <p className="text-gray-600">
                  Everything looks good? Let's get started!
                </p>
              </div>
              
              {/* Business Type Summary */}
              {selectedBT && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${selectedBT.color} rounded-xl flex items-center justify-center`}>
                      <selectedBT.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Business Type</p>
                      <h3 className="text-xl font-bold text-gray-900">{selectedBT.name}</h3>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Selected Modules */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Selected Modules ({selectedModules.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedModules.map(moduleCode => (
                    <div
                      key={moduleCode}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <Check className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {moduleCode.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <button
                  onClick={() => setStep(2)}
                  disabled={isConfiguring}
                  className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>
                
                <button
                  onClick={handleConfirm}
                  disabled={isConfiguring}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isConfiguring ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Configuring...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Complete Setup
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
