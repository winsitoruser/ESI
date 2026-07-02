import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface Module {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  route?: string;
  sortOrder?: number;
  isCore?: boolean;
  isEnabled: boolean;
}

interface Tenant {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  setupCompleted: boolean;
  onboardingStep?: number;
}

interface BusinessTypeContextType {
  businessType: string | null;
  businessTypeName: string | null;
  modules: Module[];
  tenant: Tenant | null;
  needsOnboarding: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  hasModule: (moduleCode: string) => boolean;
  refreshConfig: () => Promise<void>;
}

const BusinessTypeContext = createContext<BusinessTypeContextType | undefined>(undefined);

interface BusinessTypeProviderProps {
  children: ReactNode;
}

export function BusinessTypeProvider({ children }: BusinessTypeProviderProps) {
  const { data: session, status } = useSession();
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [businessTypeName, setBusinessTypeName] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBusinessConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/business/config');
      const data = await response.json();
      
      if (data.success) {
        setBusinessType(data.businessType);
        setBusinessTypeName(data.businessTypeName);
        setModules(data.modules || []);
        setTenant(data.tenant);
        setNeedsOnboarding(data.needsOnboarding || false);
        setIsSuperAdmin(data.isSuperAdmin || false);
      } else {
        console.error('Failed to fetch business config:', data.error);
        // Set defaults for unauthenticated or error state
        setBusinessType(null);
        setBusinessTypeName(null);
        setModules([]);
        setTenant(null);
        setNeedsOnboarding(false);
        setIsSuperAdmin(false);
      }
    } catch (error) {
      console.error('Error fetching business config:', error);
      // Set defaults on error
      setBusinessType(null);
      setBusinessTypeName(null);
      setModules([]);
      setTenant(null);
      setNeedsOnboarding(false);
      setIsSuperAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch config if user is authenticated
    if (status === 'authenticated' && session) {
      fetchBusinessConfig();
    } else if (status === 'unauthenticated') {
      // Clear config if user is not authenticated
      setBusinessType(null);
      setBusinessTypeName(null);
      setModules([]);
      setTenant(null);
      setNeedsOnboarding(false);
      setIsLoading(false);
    }
  }, [session, status]);

  const hasModule = (moduleCode: string): boolean => {
    // Super admin has access to all modules
    if (isSuperAdmin || businessType === 'super_admin') {
      return true;
    }
    return modules.some(m => m.code === moduleCode && m.isEnabled);
  };

  const refreshConfig = async () => {
    await fetchBusinessConfig();
  };

  const value: BusinessTypeContextType = {
    businessType,
    businessTypeName,
    modules,
    tenant,
    needsOnboarding,
    isLoading,
    isSuperAdmin,
    hasModule,
    refreshConfig
  };

  return (
    <BusinessTypeContext.Provider value={value}>
      {children}
    </BusinessTypeContext.Provider>
  );
}

export function useBusinessType(): BusinessTypeContextType {
  const context = useContext(BusinessTypeContext);
  if (context === undefined) {
    throw new Error('useBusinessType must be used within a BusinessTypeProvider');
  }
  return context;
}
