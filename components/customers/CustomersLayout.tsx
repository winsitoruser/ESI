import React, { ReactNode } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/layouts/DashboardLayout';

interface CustomersLayoutProps {
  children: ReactNode;
  title?: string;
}

const CustomersLayout: React.FC<CustomersLayoutProps> = ({ 
  children, 
  title = 'Manajemen Pelanggan | BEDAGANG' 
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Sistem manajemen pelanggan dan CRM" />
      </Head>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </>
  );
};

export default CustomersLayout;
