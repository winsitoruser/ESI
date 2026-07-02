import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useBusinessType } from '@/contexts/BusinessTypeContext';
import { FaSpinner, FaLock } from 'react-icons/fa';

interface ModuleGuardProps {
  moduleCode: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ModuleGuard({ 
  moduleCode, 
  children, 
  fallback,
  redirectTo = '/dashboard'
}: ModuleGuardProps) {
  const router = useRouter();
  const { hasModule, isLoading } = useBusinessType();

  useEffect(() => {
    if (!isLoading && !hasModule(moduleCode)) {
      router.push(redirectTo);
    }
  }, [hasModule, moduleCode, isLoading, router, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin h-12 w-12 mx-auto text-sky-600 mb-4" />
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!hasModule(moduleCode)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
          <FaLock className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            This module is not available for your business type.
          </p>
          <button
            onClick={() => router.push(redirectTo)}
            className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
