import React from 'react';
import { FinanceReports } from '@/modules/purchasing/components/finance-reports';
import { PurchasingNavigation } from '@/modules/purchasing/components/purchasing-navigation';
import Layout from '@/components/Layout';

export default function FinanceIntegrationPage() {
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <PurchasingNavigation />
        <FinanceReports />
      </div>
    </Layout>
  );
}
