import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import CustomersLayout from '@/components/customers/CustomersLayout';
import { useTranslation } from '@/lib/i18n';

// Dynamically import the CRM module to prevent server-side rendering issues
const CRMModule = dynamic(
  () => import('@/modules/customers/module-crm-enhanced'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-96">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-t-4 border-red-600 border-r-4 border-r-transparent animate-spin"></div>
          <p className="mt-4 text-red-600 font-medium">Memuat...</p>
        </div>
      </div>
    )
  }
);

const CustomersPage = () => {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <CustomersLayout title={t('customers.pageTitle')}>
      <Suspense fallback={
        <div className="flex items-center justify-center w-full h-96">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-t-4 border-red-600 border-r-4 border-r-transparent animate-spin"></div>
            <p className="mt-4 text-red-600 font-medium">{t('customers.loadingDashboard')}</p>
          </div>
        </div>
      }>
        <CRMModule />
      </Suspense>
    </CustomersLayout>
  );
};

export default CustomersPage;
